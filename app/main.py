from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    categorias,
    articulos,
    eventos,
    detalle_evento,
    bajas_inventario,
    proveedores,
    reposiciones,
    dashboard,
    imagenes,
    pdfs,
    rentas,
)
from app.routers.auth import obtener_usuario_actual, solo_jefe

app = FastAPI(
    title="API Eventos Mozzarella",
    description="Sistema de gestión de inventario y eventos",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción: reemplazar por la URL de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rutas públicas (sin login) ──────────────────────────────
app.include_router(auth.router)

# ── Rutas para AMBOS perfiles (jefe y almacén) ─────────────
# Artículos: ambos pueden ver, almacén no puede editar/eliminar
# (el control de qué botones se muestran lo hace el frontend)
app.include_router(articulos.router,      dependencies=[Depends(obtener_usuario_actual)])
app.include_router(categorias.router,     dependencies=[Depends(obtener_usuario_actual)])
app.include_router(eventos.router,        dependencies=[Depends(obtener_usuario_actual)])
app.include_router(detalle_evento.router, dependencies=[Depends(obtener_usuario_actual)])
app.include_router(bajas_inventario.router, dependencies=[Depends(obtener_usuario_actual)])
app.include_router(pdfs.router,           dependencies=[Depends(obtener_usuario_actual)])
app.include_router(imagenes.router,       dependencies=[Depends(obtener_usuario_actual)])

# ── Rutas SOLO para jefe ────────────────────────────────────
app.include_router(dashboard.router,      dependencies=[Depends(solo_jefe)])
app.include_router(rentas.router,         dependencies=[Depends(solo_jefe)])
app.include_router(proveedores.router,    dependencies=[Depends(solo_jefe)])
app.include_router(reposiciones.router,   dependencies=[Depends(solo_jefe)])


@app.get("/")
def raiz():
    return {"mensaje": "API Eventos Mozzarella funcionando"}


@app.get("/salud")
def salud():
    return {"estado": "ok"}