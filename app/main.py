from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    categorias,
    articulos,
    eventos,
    detalle_evento,
    bajas_inventario,
    proveedores,
    reposiciones,
    dashboard,
)

app = FastAPI(
    title="API Eventos Mozzarella",
    description="Sistema de gestión de inventario y eventos para renta de mobiliario y equipo",
    version="1.0.0",
)

# CORS: permite que el frontend (Vercel) se comunique con esta API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(categorias.router)
app.include_router(articulos.router)
app.include_router(eventos.router)
app.include_router(detalle_evento.router)
app.include_router(bajas_inventario.router)
app.include_router(proveedores.router)
app.include_router(reposiciones.router)
app.include_router(dashboard.router)

@app.get("/")
def raiz():
    return {"mensaje": "API Eventos Mozzarella funcionando correctamente"}

@app.get("/salud")
def verificar_salud():
    """Endpoint simple para que Railway confirme que el servicio está activo."""
    return {"estado": "ok"}