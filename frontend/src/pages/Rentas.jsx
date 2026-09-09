import { useEffect, useState } from "react";
import { Plus, FileText, Download, Search, Pencil } from "lucide-react";
import { listarArticulos, listarCategorias } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, TextArea, Badge } from "../components/ui";
import ModalCotizacion from "../components/ModalCotizacion";
import { abrirPdf } from "../lib/pdf";
import { coincideFlexible } from "../lib/busqueda";

const VACIO = {
  nombre_cliente: "",
  telefono: "",
  fecha_entrega: "",
  fecha_devolucion: "",
  estado: "cotizacion",
  notas: "",
};

const TONO_ESTADO = {
  cotizacion: "neutro",
  confirmada: "bueno",
  entregada: "dorado",
  devuelta: "neutro",
  cancelada: "alerta",
};

const ESTADOS = ["cotizacion", "confirmada", "entregada", "devuelta", "cancelada"];

export default function Rentas() {
  const [rentas, setRentas]         = useState([]);
  const [articulos, setArticulos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);

  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm]             = useState(VACIO);
  const [seleccion, setSeleccion]   = useState({});
  const [guardando, setGuardando]   = useState(false);
  const [paso, setPaso]             = useState(1);

  const [busqueda, setBusqueda]               = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [editandoEstado, setEditandoEstado] = useState(null);
  const [nuevoEstado, setNuevoEstado]       = useState("");

  const [rentaCotizacion, setRentaCotizacion] = useState(null);

  async function cargar() {
    try {
      const [r, a, c] = await Promise.all([
        api.get("/rentas/").then(res => res.data),
        listarArticulos({ estado: "activo" }),
        listarCategorias(),
      ]);
      setRentas(r);
      setArticulos(a);
      setCategorias(c);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardarEstado(e) {
    e.preventDefault();
    try {
      await api.put(`/rentas/${editandoEstado.id_renta}`, { estado: nuevoEstado });
      setEditandoEstado(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al actualizar.");
    }
  }

  function actualizarSeleccion(idArticulo, campo, valor) {
    setSeleccion(prev => ({
      ...prev,
      [idArticulo]: {
        cantidad: 0,
        precio_unitario: 0,
        ...prev[idArticulo],
        [campo]: Math.max(0, parseFloat(valor) || 0),
      },
    }));
  }

  function articulosSeleccionados() {
    return Object.entries(seleccion)
      .filter(([, v]) => v.cantidad > 0)
      .map(([id, v]) => ({
        id_articulo:     Number(id),
        cantidad:        v.cantidad,
        precio_unitario: v.precio_unitario || 0,
      }));
  }

  function totalCotizacion() {
    return articulosSeleccionados().reduce(
      (acc, a) => acc + a.cantidad * a.precio_unitario, 0
    );
  }

  function abrirModal() {
    setForm(VACIO);
    setSeleccion({});
    setBusqueda("");
    setFiltroCategoria("");
    setPaso(1);
    setModalNueva(true);
  }

  async function guardar() {
    const arts = articulosSeleccionados();
    if (arts.length === 0) {
      alert("Selecciona al menos un artículo para la renta.");
      return;
    }
    setGuardando(true);
    try {
      await api.post("/rentas/", {
        ...form,
        fecha_devolucion: form.fecha_devolucion || null,
        articulos: arts,
      });
      setModalNueva(false);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Ocurrió un error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  const articulosFiltrados = articulos.filter(a => {
    const coincide  = coincideFlexible(a.nombre, busqueda);
    const categoria = !filtroCategoria || a.id_categoria === Number(filtroCategoria);
    return coincide && categoria;
  });

  const seleccionados = articulosSeleccionados();

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-soft">Cargando...</p>
    </div>
  );

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Operación</p>
          <h1 className="font-display text-2xl font-semibold">Rentas</h1>
        </div>
        <Boton variante="dorado" onClick={abrirModal}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Nueva renta</span>
        </Boton>
      </div>

      {error && (
        <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        {rentas.length === 0 ? (
          <p className="px-4 py-8 text-center text-ink-soft text-sm">No hay rentas registradas.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Entrega</th>
                <th className="px-4 py-3 font-medium">Devolución</th>
                <th className="px-4 py-3 font-medium text-right">Total</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rentas.map(r => (
                <tr key={r.id_renta} className="border-b border-line last:border-0 hover:bg-mist/50">
                  <td className="px-4 py-3 font-medium">{r.nombre_cliente}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(r.fecha_entrega + "T00:00:00").toLocaleDateString("es-MX", {
                      day: "numeric", month: "short"
                    })}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.fecha_devolucion
                      ? new Date(r.fecha_devolucion + "T00:00:00").toLocaleDateString("es-MX", {
                          day: "numeric", month: "short"
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${Number(r.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    {/* Badge clickeable para cambiar estado */}
                    <button
                      onClick={() => { setEditandoEstado(r); setNuevoEstado(r.estado); }}
                      className="group/estado"
                      title="Cambiar estado"
                    >
                      <Badge tono={TONO_ESTADO[r.estado] || "neutro"}>
                        {r.estado}
                        <Pencil size={10} className="inline ml-1 opacity-0 group-hover/estado:opacity-60" />
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button onClick={() => abrirPdf(`/pdf/renta/${r.id_renta}/trabajadores`)}
                        className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink">
                        <Download size={13} /> Trabajadores
                      </button>
                      <button onClick={() => setRentaCotizacion(r.id_renta)}
                        className="flex items-center gap-1 text-xs font-medium text-gold-deep hover:underline">
                        <FileText size={13} /> Cotización
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal nueva renta — Paso 1 */}
      <Modal abierto={modalNueva && paso === 1} onCerrar={() => setModalNueva(false)} titulo="Nueva renta">
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Nombre del cliente">
            <Input required value={form.nombre_cliente}
              onChange={e => setForm({ ...form, nombre_cliente: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Teléfono">
              <Input value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Estado">
              <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
                {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Fecha de entrega">
              <Input type="date" required value={form.fecha_entrega}
                onChange={e => setForm({ ...form, fecha_entrega: e.target.value })} />
            </Campo>
            <Campo etiqueta="Fecha de devolución">
              <Input type="date" value={form.fecha_devolucion}
                onChange={e => setForm({ ...form, fecha_devolucion: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Notas">
            <TextArea value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" onClick={() => setModalNueva(false)}>Cancelar</Boton>
            <Boton variante="dorado" onClick={() => {
              if (!form.nombre_cliente || !form.fecha_entrega) {
                alert("Nombre del cliente y fecha de entrega son obligatorios.");
                return;
              }
              setPaso(2);
            }}>
              Siguiente →
            </Boton>
          </div>
        </div>
      </Modal>

      {/* Paso 2: artículos */}
      {modalNueva && paso === 2 && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-paper rounded-2xl w-full max-w-3xl flex flex-col" style={{ maxHeight: "90vh" }}>
            <div className="px-6 pt-6 pb-4 border-b border-line shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-semibold">Seleccionar artículos</h2>
                {seleccionados.length > 0 && (
                  <span className="text-sm font-medium text-gold-deep">
                    {seleccionados.length} artículo{seleccionados.length !== 1 ? "s" : ""} ·
                    ${totalCotizacion().toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-soft" />
                  <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
                    placeholder="Buscar artículo..."
                    className="w-full pl-8 pr-3 py-2 rounded-lg border border-line bg-paper text-sm
                               focus:outline-none focus:ring-2 focus:ring-gold/40" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setFiltroCategoria("")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filtroCategoria === "" ? "bg-ink text-white" : "bg-mist text-ink-soft hover:bg-paper border border-line"
                    }`}>Todos</button>
                  {categorias.map(cat => (
                    <button key={cat.id_categoria}
                      onClick={() => setFiltroCategoria(
                        filtroCategoria === String(cat.id_categoria) ? "" : String(cat.id_categoria)
                      )}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filtroCategoria === String(cat.id_categoria)
                          ? "bg-gold-deep text-white"
                          : "bg-mist text-ink-soft hover:bg-paper border border-line"
                      }`}>{cat.nombre}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-3">
              {articulosFiltrados.length === 0 ? (
                <p className="text-center text-ink-soft text-sm py-8">No se encontraron artículos.</p>
              ) : (
                <div className="flex flex-col gap-0 rounded-xl border border-line overflow-hidden">
                  {articulosFiltrados.map((a, idx) => {
                    const cant   = seleccion[a.id_articulo]?.cantidad || 0;
                    const precio = seleccion[a.id_articulo]?.precio_unitario || 0;
                    const cat    = categorias.find(c => c.id_categoria === a.id_categoria);
                    return (
                      <div key={a.id_articulo}
                        className={`flex items-center gap-3 px-4 py-2.5 border-b border-line last:border-0
                                    ${cant > 0 ? "bg-gold-pale/40" : idx % 2 === 0 ? "bg-paper" : "bg-mist/30"}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{a.nombre}</p>
                          <p className="text-xs text-ink-soft">{cat?.nombre} · {a.cantidad_disponible} disp.</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-ink-soft">Cant.</span>
                          <input type="number" min="0" value={cant || ""} placeholder="0"
                            onChange={e => actualizarSeleccion(a.id_articulo, "cantidad", e.target.value)}
                            className="w-14 text-center text-sm border border-line rounded-lg py-1
                                       focus:outline-none focus:ring-2 focus:ring-gold/40 bg-paper" />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-ink-soft">$</span>
                          <input type="number" min="0" step="0.01" value={precio || ""} placeholder="0"
                            onChange={e => actualizarSeleccion(a.id_articulo, "precio_unitario", e.target.value)}
                            className="w-20 text-center text-sm border border-line rounded-lg py-1
                                       focus:outline-none focus:ring-2 focus:ring-gold/40 bg-paper" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-line flex justify-between items-center shrink-0">
              <Boton variante="fantasma" onClick={() => setPaso(1)}>← Atrás</Boton>
              <div className="flex gap-2">
                <Boton variante="fantasma" onClick={() => setModalNueva(false)}>Cancelar</Boton>
                <Boton variante="dorado" onClick={guardar} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar renta"}
                </Boton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cambiar estado */}
      <Modal abierto={!!editandoEstado} onCerrar={() => setEditandoEstado(null)} titulo="Cambiar estado de la renta">
        <form onSubmit={guardarEstado} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Renta: <span className="font-medium text-ink">{editandoEstado?.nombre_cliente}</span>
          </p>
          <Campo etiqueta="Nuevo estado">
            <Select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" type="button" onClick={() => setEditandoEstado(null)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit">Guardar estado</Boton>
          </div>
        </form>
      </Modal>

      <ModalCotizacion
        abierto={!!rentaCotizacion}
        onCerrar={() => setRentaCotizacion(null)}
        urlPdf={`/pdf/renta/${rentaCotizacion}/cotizacion`}
      />
    </div>
  );
}