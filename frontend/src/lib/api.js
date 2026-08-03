import axios from "axios";

// En desarrollo local apunta a tu backend en localhost.
// Cuando subas a Render, crea un archivo .env con:
// VITE_API_URL=https://tu-backend.onrender.com
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
});

// ---------- Dashboard ----------
export async function obtenerResumenDashboard() {
  const { data } = await api.get("/dashboard/resumen");
  return data;
}

export async function obtenerProximosEventos(limite = 5) {
  const { data } = await api.get("/dashboard/proximos-eventos", { params: { limite } });
  return data;
}

// ---------- Categorías ----------
export async function listarCategorias() {
  const { data } = await api.get("/categorias/");
  return data;
}

// ---------- Artículos ----------
export async function listarArticulos(filtros = {}) {
  const { data } = await api.get("/articulos/", { params: filtros });
  return data;
}

export async function crearArticulo(articulo) {
  const { data } = await api.post("/articulos/", articulo);
  return data;
}

export async function actualizarArticulo(id, cambios) {
  const { data } = await api.put(`/articulos/${id}`, cambios);
  return data;
}

export async function eliminarArticulo(id) {
  await api.delete(`/articulos/${id}`);
}

// ---------- Eventos ----------
export async function listarEventos(filtros = {}) {
  const { data } = await api.get("/eventos/", { params: filtros });
  return data;
}

export async function obtenerEvento(id) {
  const { data } = await api.get(`/eventos/${id}`);
  return data;
}

export async function crearEvento(evento) {
  const { data } = await api.post("/eventos/", evento);
  return data;
}

export async function actualizarEvento(id, cambios) {
  const { data } = await api.put(`/eventos/${id}`, cambios);
  return data;
}

export async function eliminarEvento(id) {
  await api.delete(`/eventos/${id}`);
}

// ---------- Detalle de Evento ----------
export async function listarDetalleEvento(idEvento) {
  const { data } = await api.get(`/detalle-evento/evento/${idEvento}`);
  return data;
}

export async function asignarArticuloEvento(detalle) {
  const { data } = await api.post("/detalle-evento/", detalle);
  return data;
}

export async function actualizarDetalleEvento(idDetalle, cambios) {
  const { data } = await api.put(`/detalle-evento/${idDetalle}`, cambios);
  return data;
}

export async function eliminarDetalleEvento(idDetalle) {
  await api.delete(`/detalle-evento/${idDetalle}`);
}

export async function obtenerAlertasEvento(idEvento) {
  const { data } = await api.get(`/detalle-evento/evento/${idEvento}/alertas`);
  return data;
}

// ---------- Bajas de inventario ----------
export async function listarBajas(filtros = {}) {
  const { data } = await api.get("/bajas/", { params: filtros });
  return data;
}

export async function registrarBaja(baja) {
  const { data } = await api.post("/bajas/", baja);
  return data;
}

// ---------- Proveedores ----------
export async function listarProveedores() {
  const { data } = await api.get("/proveedores/");
  return data;
}

export async function crearProveedor(proveedor) {
  const { data } = await api.post("/proveedores/", proveedor);
  return data;
}

export async function actualizarProveedor(id, cambios) {
  const { data } = await api.put(`/proveedores/${id}`, cambios);
  return data;
}

export async function eliminarProveedor(id) {
  await api.delete(`/proveedores/${id}`);
}

// ---------- Reposiciones ----------
export async function listarReposiciones(filtros = {}) {
  const { data } = await api.get("/reposiciones/", { params: filtros });
  return data;
}

export async function registrarReposicion(reposicion) {
  const { data } = await api.post("/reposiciones/", reposicion);
  return data;
}
