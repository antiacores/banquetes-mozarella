from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    auth,
    categorias,
    articulos,
    eventos,
    detalle_evento,
    bajas_inventario,
    imagenes,
    pdfs,
    rentas,
    clientes,
)
from app.routers.auth import obtener_usuario_actual, solo_jefe
from app.routers.cajon import router as router_cajon
from app.routers import dashboard

app = FastAPI(
    title="API Eventos Mozzarella",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Públicas ────────────────────────────────────────────────────────────
app.include_router(auth.router)

# ── Ambos perfiles ──────────────────────────────────────────────────────
app.include_router(articulos.router,        dependencies=[Depends(obtener_usuario_actual)])
app.include_router(categorias.router,       dependencies=[Depends(obtener_usuario_actual)])
app.include_router(eventos.router,          dependencies=[Depends(obtener_usuario_actual)])
app.include_router(detalle_evento.router,   dependencies=[Depends(obtener_usuario_actual)])
app.include_router(bajas_inventario.router, dependencies=[Depends(obtener_usuario_actual)])
app.include_router(pdfs.router,             dependencies=[Depends(obtener_usuario_actual)])
app.include_router(imagenes.router,         dependencies=[Depends(obtener_usuario_actual)])
app.include_router(router_cajon,            dependencies=[Depends(obtener_usuario_actual)])

# ── Solo jefe ───────────────────────────────────────────────────────────
app.include_router(rentas.router,           dependencies=[Depends(solo_jefe)])
app.include_router(clientes.router,         dependencies=[Depends(solo_jefe)])
app.include_router(dashboard.router, dependencies=[Depends(solo_jefe)])


@app.get("/")
def raiz():
    return {"mensaje": "API Eventos Mozzarella funcionando"}

@app.get("/salud")
def salud():
    return {"estado": "ok"}