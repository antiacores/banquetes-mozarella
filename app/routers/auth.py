import os
import bcrypt
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter(prefix="/auth", tags=["Autenticación"])

SECRET_KEY = os.getenv("SECRET_KEY", "clave-temporal-cambiar-en-produccion")
ALGORITHM = "HS256"
TOKEN_EXPIRE_HORAS = 12

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Schemas ──────────────────────────────────────────────────

class TokenRespuesta(BaseModel):
    access_token: str
    token_type: str
    perfil: str
    nombre: str


class UsuarioActual(BaseModel):
    id_usuario: int
    nombre: str
    correo: str
    perfil: str  # 'jefe' o 'almacen'


# ── Utilidades ───────────────────────────────────────────────

def verificar_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def crear_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HORAS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def obtener_usuario_actual(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> UsuarioActual:
    """Dependencia: extrae y valida el JWT, devuelve el usuario."""
    error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if not correo:
            raise error
    except JWTError:
        raise error

    usuario = db.query(models.Usuario).filter(
        models.Usuario.correo == correo,
        models.Usuario.activo == True,
    ).first()
    if not usuario:
        raise error

    return UsuarioActual(
        id_usuario=usuario.id_usuario,
        nombre=usuario.nombre,
        correo=usuario.correo,
        perfil=usuario.perfil,
    )


def solo_jefe(usuario: UsuarioActual = Depends(obtener_usuario_actual)) -> UsuarioActual:
    """Dependencia: solo permite acceso al perfil 'jefe'."""
    if usuario.perfil != "jefe":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido al administrador"
        )
    return usuario


# ── Endpoints ────────────────────────────────────────────────

@router.post("/login", response_model=TokenRespuesta)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = db.query(models.Usuario).filter(
        models.Usuario.correo == form.username,
        models.Usuario.activo == True,
    ).first()

    if not usuario or not verificar_password(form.password, usuario.contrasena):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
        )

    token = crear_token({"sub": usuario.correo, "perfil": usuario.perfil})
    return TokenRespuesta(
        access_token=token,
        token_type="bearer",
        perfil=usuario.perfil,
        nombre=usuario.nombre,
    )


@router.get("/me", response_model=UsuarioActual)
def yo(usuario: UsuarioActual = Depends(obtener_usuario_actual)):
    """Devuelve los datos del usuario autenticado."""
    return usuario


@router.post("/cambiar-password")
def cambiar_password(
    body: dict,
    usuario: UsuarioActual = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    """Permite a cualquier usuario cambiar su propia contraseña."""
    password_actual = body.get("password_actual", "")
    password_nuevo  = body.get("password_nuevo", "")

    if len(password_nuevo) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    db_usuario = db.query(models.Usuario).filter(
        models.Usuario.id_usuario == usuario.id_usuario
    ).first()

    if not verificar_password(password_actual, db_usuario.contrasena):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")

    nuevo_hash = bcrypt.hashpw(password_nuevo.encode(), bcrypt.gensalt(12)).decode()
    db_usuario.contrasena = nuevo_hash
    db.commit()
    return {"mensaje": "Contraseña actualizada correctamente"}