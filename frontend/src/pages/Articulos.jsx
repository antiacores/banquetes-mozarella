import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Search, Tag, Image, X, ZoomIn } from "lucide-react";
import { listarArticulos, listarCategorias, crearArticulo, actualizarArticulo } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, Badge } from "../components/ui";
import { coincideFlexible } from "../lib/busqueda";
import { useAuth, esJefe } from "../lib/AuthContext";

const VACIO_ART = {
  id_categoria: "", nombre: "", cantidad_total: 0,
  cantidad_disponible: 0, cantidad_minima: 0,
  costo_unitario: "", estado: "activo", observaciones: "",
};
const VACIO_CAT = { nombre: "", descripcion: "" };

export default function Articulos() {
  // ── Auth — DENTRO del componente ────────────────────────────────────────
  const { usuario } = useAuth();
  const puedeEditar = esJefe(usuario);

  const [articulos, setArticulos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);

  const [busqueda, setBusqueda]               = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [modalArt, setModalArt]         = useState(false);
  const [editandoArt, setEditandoArt]   = useState(null);
  const [formArt, setFormArt]           = useState(VACIO_ART);
  const [guardandoArt, setGuardandoArt] = useState(false);

  const [modalCat, setModalCat]         = useState(false);
  const [editandoCat, setEditandoCat]   = useState(null);
  const [formCat, setFormCat]           = useState(VACIO_CAT);
  const [guardandoCat, setGuardandoCat] = useState(false);

  const [subiendoImagen, setSubiendoImagen] = useState(null);
  const [artParaImagen, setArtParaImagen]   = useState(null);
  const inputImagen = useRef(null);

  const [fotoGrande, setFotoGrande]         = useState(null);
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  async function cargar() {
    try {
      const [arts, cats] = await Promise.all([listarArticulos(), listarCategorias()]);
      setArticulos(arts);
      setCategorias(cats);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  // ── Artículos ────────────────────────────────────────────────────────────
  function abrirNuevoArt() {
    setEditandoArt(null);
    setFormArt(VACIO_ART);
    setModalArt(true);
  }

  function abrirEditarArt(art) {
    setEditandoArt(art);
    setFormArt({
      id_categoria:       art.id_categoria,
      nombre:             art.nombre,
      cantidad_total:     art.cantidad_total,
      cantidad_disponible: art.cantidad_disponible,
      cantidad_minima:    art.cantidad_minima,
      costo_unitario:     art.costo_unitario ?? "",
      estado:             art.estado,
      observaciones:      art.observaciones ?? "",
    });
    setModalArt(true);
  }

  async function guardarArt(e) {
    e.preventDefault();
    setGuardandoArt(true);
    try {
      const payload = {
        ...formArt,
        id_categoria:        Number(formArt.id_categoria),
        cantidad_total:      Number(formArt.cantidad_total),
        cantidad_disponible: Number(formArt.cantidad_disponible),
        cantidad_minima:     Number(formArt.cantidad_minima),
        costo_unitario:      formArt.costo_unitario === "" ? null : Number(formArt.costo_unitario),
      };
      if (editandoArt) await actualizarArticulo(editandoArt.id_articulo, payload);
      else await crearArticulo(payload);
      setModalArt(false);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al guardar.");
    } finally {
      setGuardandoArt(false);
    }
  }

  async function eliminarArt(id) {
    try {
      await api.delete(`/articulos/${id}`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.");
    }
  }

  // ── Imagen — solo para jefe ──────────────────────────────────────────────
  function abrirSelectorImagen(art, e) {
    e.stopPropagation();
    setArtParaImagen(art);
    inputImagen.current?.click();
  }

  async function subirImagen(e) {
    const archivo = e.target.files?.[0];
    if (!archivo || !artParaImagen) return;
    setSubiendoImagen(artParaImagen.id_articulo);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      await api.post(`/imagenes/articulo/${artParaImagen.id_articulo}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al subir imagen.");
    } finally {
      setSubiendoImagen(null);
      setArtParaImagen(null);
      e.target.value = "";
    }
  }

  async function quitarImagen(id, e) {
    e.stopPropagation();
    try {
      await api.delete(`/imagenes/articulo/${id}`);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al quitar imagen.");
    }
  }

  // ── Categorías — solo para jefe ──────────────────────────────────────────
  async function guardarCat(e) {
    e.preventDefault();
    setGuardandoCat(true);
    try {
      if (editandoCat) await api.put(`/categorias/${editandoCat.id_categoria}`, formCat);
      else await api.post("/categorias/", formCat);
      setEditandoCat(null);
      setFormCat(VACIO_CAT);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al guardar categoría.");
    } finally {
      setGuardandoCat(false);
    }
  }

  async function eliminarCat(id) {
    try {
      await api.delete(`/categorias/${id}`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar categoría.");
    }
  }

  // ── Filtrado ─────────────────────────────────────────────────────────────
  const articulosFiltrados = articulos.filter(a => {
    const coincide  = coincideFlexible(a.nombre, busqueda);
    const categoria = !filtroCategoria || a.id_categoria === Number(filtroCategoria);
    return coincide && categoria;
  });

  function nombreCategoria(id) {
    return categorias.find(c => c.id_categoria === id)?.nombre || "—";
  }

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-soft">Cargando...</p>
    </div>
  );

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Inventario</p>
          <h1 className="font-display text-2xl font-semibold">Artículos</h1>
        </div>
        {/* Botones de admin — solo jefe */}
        {puedeEditar && (
          <div className="flex gap-2">
            <Boton variante="fantasma" onClick={() => setModalCat(true)}>
              <span className="flex items-center gap-1.5"><Tag size={15} /> Categorías</span>
            </Boton>
            <Boton variante="dorado" onClick={abrirNuevoArt}>
              <span className="flex items-center gap-1.5"><Plus size={16} /> Nuevo artículo</span>
            </Boton>
          </div>
        )}
      </div>

      {error && <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {/* Filtros */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, sin importar acentos..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-paper text-sm
                       focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={e => setFiltroCategoria(e.target.value)}
          className="px-3 py-2 rounded-lg border border-line bg-paper text-sm
                     focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
          ))}
        </select>
        <span className="text-sm text-ink-soft self-center">{articulosFiltrados.length} artículos</span>
      </div>

      {/* Input oculto imagen — solo jefe lo usa */}
      {puedeEditar && (
        <input ref={inputImagen} type="file" accept="image/jpeg,image/png,image/webp"
          className="hidden" onChange={subirImagen} />
      )}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {articulosFiltrados.map(art => (
          <div key={art.id_articulo}
            className="bg-paper rounded-xl border border-line overflow-hidden group flex flex-col">

            {/* Foto */}
            <div className="relative aspect-square bg-mist overflow-hidden">
              {art.imagen_url ? (
                <>
                  <button
                    onClick={() => setFotoGrande({ url: art.imagen_url, nombre: art.nombre })}
                    className="w-full h-full block" title="Ver foto en grande">
                    <img src={art.imagen_url} alt={art.nombre}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200" />
                    <div className="absolute inset-0 bg-ink/0 hover:bg-ink/10 transition-colors
                                    flex items-center justify-center">
                      <ZoomIn size={24} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                  </button>
                  {/* Controles de imagen — solo jefe */}
                  {puedeEditar && (
                    <>
                      <button onClick={e => quitarImagen(art.id_articulo, e)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-ink/60 text-white
                                   flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Quitar imagen">
                        <X size={12} />
                      </button>
                      <button onClick={e => abrirSelectorImagen(art, e)}
                        className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-ink/60 text-white
                                   flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Cambiar imagen">
                        <Image size={12} />
                      </button>
                    </>
                  )}
                </>
              ) : (
                /* Sin foto: jefe ve botón de subir, almacén ve gris vacío */
                puedeEditar ? (
                  <button onClick={e => abrirSelectorImagen(art, e)}
                    className="w-full h-full flex flex-col items-center justify-center gap-1
                               text-ink-soft hover:text-gold-deep hover:bg-gold-pale transition-colors"
                    disabled={subiendoImagen === art.id_articulo}>
                    {subiendoImagen === art.id_articulo
                      ? <p className="text-xs">Subiendo...</p>
                      : <><Image size={22} /><span className="text-xs">Agregar foto</span></>
                    }
                  </button>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-soft/30">
                    <Image size={28} />
                  </div>
                )
              )}
            </div>

            {/* Info */}
            <div className="p-3 flex flex-col gap-1 flex-1">
              <p className="text-xs text-ink-soft">{nombreCategoria(art.id_categoria)}</p>
              <p className="text-sm font-medium leading-tight">{art.nombre}</p>
              <div className="flex items-center justify-between mt-1">
                <span className={`text-xs font-medium ${
                  art.cantidad_minima > 0 &&
                  (art.cantidad_disponible_real ?? art.cantidad_disponible) < art.cantidad_minima
                    ? "text-alert" : "text-ink-soft"
                }`}>
                  {art.cantidad_disponible_real ?? art.cantidad_disponible} / {art.cantidad_total}
                </span>
                {/* Precio — solo jefe */}
                {puedeEditar && art.costo_unitario && (
                  <span className="text-xs text-gold-deep">
                    ${Number(art.costo_unitario).toLocaleString("es-MX")}
                  </span>
                )}
              </div>
              {art.estado === "inactivo" && <Badge tono="neutro">inactivo</Badge>}
            </div>

            {/* Acciones — solo jefe */}
            {puedeEditar && (
              <div className="px-3 pb-3 flex gap-1">
                <button onClick={() => abrirEditarArt(art)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs text-ink-soft
                             hover:text-ink py-1.5 rounded-lg hover:bg-mist transition-colors">
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={() => setConfirmarEliminar({ tipo: "articulo", id: art.id_articulo, nombre: art.nombre })}
                  className="flex items-center justify-center text-xs text-ink-soft
                             hover:text-alert py-1.5 px-2 rounded-lg hover:bg-alert-pale transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}

        {articulosFiltrados.length === 0 && (
          <div className="col-span-full py-12 text-center text-ink-soft text-sm">
            No se encontraron artículos.
          </div>
        )}
      </div>

      {/* Modal foto en grande */}
      {fotoGrande && (
        <div className="fixed inset-0 z-50 bg-ink/80 flex items-center justify-center p-4"
          onClick={() => setFotoGrande(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={fotoGrande.url} alt={fotoGrande.nombre}
              className="w-full rounded-xl object-contain max-h-[80vh]" />
            <p className="text-white text-center mt-3 font-medium">{fotoGrande.nombre}</p>
            <button onClick={() => setFotoGrande(null)}
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-ink/60 text-white
                         flex items-center justify-center hover:bg-ink">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Modal artículo — solo jefe llega aquí */}
      <Modal abierto={modalArt} onCerrar={() => setModalArt(false)}
        titulo={editandoArt ? "Editar artículo" : "Nuevo artículo"}>
        <form onSubmit={guardarArt} className="flex flex-col gap-4">
          <Campo etiqueta="Nombre">
            <Input required value={formArt.nombre}
              onChange={e => setFormArt({ ...formArt, nombre: e.target.value })} />
          </Campo>
          <Campo etiqueta="Categoría">
            <Select required value={formArt.id_categoria}
              onChange={e => setFormArt({ ...formArt, id_categoria: e.target.value })}>
              <option value="">Selecciona una categoría</option>
              {categorias.map(c => (
                <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>
              ))}
            </Select>
          </Campo>
          <div className="grid grid-cols-3 gap-3">
            <Campo etiqueta="Total">
              <Input type="number" min="0" required value={formArt.cantidad_total}
                onChange={e => setFormArt({ ...formArt, cantidad_total: e.target.value })} />
            </Campo>
            <Campo etiqueta="Disponible">
              <Input type="number" min="0" required value={formArt.cantidad_disponible}
                onChange={e => setFormArt({ ...formArt, cantidad_disponible: e.target.value })} />
            </Campo>
            <Campo etiqueta="Mínimo">
              <Input type="number" min="0" required value={formArt.cantidad_minima}
                onChange={e => setFormArt({ ...formArt, cantidad_minima: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Precio unitario (opcional)">
            <Input type="number" min="0" step="0.01" value={formArt.costo_unitario}
              onChange={e => setFormArt({ ...formArt, costo_unitario: e.target.value })} />
          </Campo>
          <Campo etiqueta="Estado">
            <Select value={formArt.estado}
              onChange={e => setFormArt({ ...formArt, estado: e.target.value })}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </Select>
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalArt(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit" disabled={guardandoArt}>
              {guardandoArt ? "Guardando..." : "Guardar"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal categorías — solo jefe */}
      <Modal abierto={modalCat} onCerrar={() => setModalCat(false)} titulo="Categorías">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {categorias.map(cat => (
              <div key={cat.id_categoria}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-mist">
                <div>
                  <p className="text-sm font-medium">{cat.nombre}</p>
                  {cat.descripcion && <p className="text-xs text-ink-soft">{cat.descripcion}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditandoCat(cat); setFormCat({ nombre: cat.nombre, descripcion: cat.descripcion ?? "" }); }}
                    className="p-1.5 rounded hover:bg-paper text-ink-soft hover:text-ink">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => setConfirmarEliminar({ tipo: "categoria", id: cat.id_categoria, nombre: cat.nombre })}
                    className="p-1.5 rounded hover:bg-alert-pale text-ink-soft hover:text-alert">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-line pt-4">
            <p className="text-xs font-medium text-ink-soft mb-3">
              {editandoCat ? `Editando: ${editandoCat.nombre}` : "Nueva categoría"}
            </p>
            <form onSubmit={guardarCat} className="flex flex-col gap-3">
              <Campo etiqueta="Nombre">
                <Input required value={formCat.nombre}
                  onChange={e => setFormCat({ ...formCat, nombre: e.target.value })} />
              </Campo>
              <Campo etiqueta="Descripción (opcional)">
                <Input value={formCat.descripcion}
                  onChange={e => setFormCat({ ...formCat, descripcion: e.target.value })} />
              </Campo>
              <div className="flex gap-2">
                {editandoCat && (
                  <Boton variante="fantasma" type="button"
                    onClick={() => { setEditandoCat(null); setFormCat(VACIO_CAT); }}>
                    Cancelar edición
                  </Boton>
                )}
                <Boton variante="dorado" type="submit" disabled={guardandoCat} className="flex-1">
                  {guardandoCat ? "Guardando..." : editandoCat ? "Guardar cambios" : "Agregar categoría"}
                </Boton>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)}
        titulo="Confirmar eliminación">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            ¿Segura que quieres eliminar{" "}
            <span className="font-medium text-ink">"{confirmarEliminar?.nombre}"</span>?
            {confirmarEliminar?.tipo === "articulo" && " Si tiene movimientos, no se podrá eliminar (solo inactivar)."}
            {confirmarEliminar?.tipo === "categoria" && " Si tiene artículos asignados, no se podrá eliminar."}
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmarEliminar(null)}>Cancelar</Boton>
            <Boton variante="peligro"
              onClick={() => {
                if (confirmarEliminar?.tipo === "articulo") eliminarArt(confirmarEliminar.id);
                else eliminarCat(confirmarEliminar.id);
              }}>
              Eliminar
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}