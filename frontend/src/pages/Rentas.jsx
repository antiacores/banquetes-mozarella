import { useEffect, useState } from "react";
import { Plus, FileText, Download, ChevronDown, ChevronUp } from "lucide-react";
import { listarArticulos, listarCategorias } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, TextArea, Badge } from "../components/ui";
import { abrirPdf } from "../lib/pdf";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

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

export default function Rentas() {
  const [rentas, setRentas] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // Formulario nueva renta
  const [modalNueva, setModalNueva] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [seleccion, setSeleccion] = useState({});
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});
  const [guardando, setGuardando] = useState(false);

  // Modal PDF
  const [modalPdf, setModalPdf] = useState(null); // { id_renta }
  const [fleteRenta, setFleteRenta] = useState(0);

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
      const abiertas = {};
      c.forEach(cat => { abiertas[cat.id_categoria] = true; });
      setCategoriasAbiertas(abiertas);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function toggleCategoria(id) {
    setCategoriasAbiertas(prev => ({ ...prev, [id]: !prev[id] }));
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
        id_articulo: Number(id),
        cantidad: v.cantidad,
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
    setModalNueva(true);
  }

  async function guardar(e) {
    e.preventDefault();
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

  // ── PDF para trabajadores ────────────────────────────────────────────────
  function exportarTrabajadores(idRenta) {
  abrirPdf(`/pdf/renta/${idRenta}/trabajadores`);
}

  // ── PDF cotización cliente ───────────────────────────────────────────────
  function abrirModalCotizacion(idRenta) {
    setFleteRenta(0);
    setModalPdf({ id_renta: idRenta });
  }

  function exportarCotizacion(e) {
  e.preventDefault();
  abrirPdf(`/pdf/renta/${modalPdf.id_renta}/cotizacion?flete=${fleteRenta}`);
  setModalPdf(null);
}

  const artsPorCategoria = categorias
    .map(cat => ({ ...cat, articulos: articulos.filter(a => a.id_categoria === cat.id_categoria) }))
    .filter(cat => cat.articulos.length > 0);

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-soft">Cargando...</p></div>;
  }

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
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rentas.map(r => (
                <tr key={r.id_renta} className="border-b border-line last:border-0 hover:bg-mist/50">
                  <td className="px-4 py-3 font-medium">{r.nombre_cliente}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(r.fecha_entrega + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.fecha_devolucion
                      ? new Date(r.fecha_devolucion + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    ${Number(r.total).toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tono={TONO_ESTADO[r.estado] || "neutro"}>{r.estado}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <button
                        onClick={() => exportarTrabajadores(r.id_renta)}
                        className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink"
                      >
                        <Download size={13} /> Trabajadores
                      </button>
                      <button
                        onClick={() => abrirModalCotizacion(r.id_renta)}
                        className="flex items-center gap-1 text-xs font-medium text-gold-deep hover:underline"
                      >
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

      {/* Modal nueva renta */}
      <Modal abierto={modalNueva} onCerrar={() => setModalNueva(false)} titulo="Nueva renta">
        <form onSubmit={guardar} className="flex flex-col gap-4">
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
                <option value="cotizacion">Cotización</option>
                <option value="confirmada">Confirmada</option>
                <option value="entregada">Entregada</option>
                <option value="devuelta">Devuelta</option>
                <option value="cancelada">Cancelada</option>
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

          {/* Checklist de artículos */}
          <div>
            <p className="text-xs font-medium text-ink-soft mb-2">
              ARTÍCULOS A RENTAR
              {articulosSeleccionados().length > 0 && (
                <span className="ml-2 text-gold-deep">
                  · Total: ${totalCotizacion().toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
              )}
            </p>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {artsPorCategoria.map(cat => (
                <div key={cat.id_categoria} className="rounded-lg border border-line overflow-hidden">
                  <button type="button" onClick={() => toggleCategoria(cat.id_categoria)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-ink-soft bg-mist hover:bg-mist/70">
                    <span className="uppercase tracking-wide">{cat.nombre}</span>
                    {categoriasAbiertas[cat.id_categoria] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                  {categoriasAbiertas[cat.id_categoria] && (
                    <div>
                      {cat.articulos.map(a => (
                        <div key={a.id_articulo} className="flex items-center gap-2 px-3 py-2 border-t border-line">
                          <span className="text-sm flex-1 truncate">{a.nombre}</span>
                          <span className="text-xs text-ink-soft shrink-0">{a.cantidad_disponible} disp.</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-ink-soft">Cant.</span>
                            <input type="number" min="0"
                              value={seleccion[a.id_articulo]?.cantidad || 0}
                              onChange={e => actualizarSeleccion(a.id_articulo, "cantidad", e.target.value)}
                              className="w-14 text-center text-xs border border-line rounded py-1 focus:outline-none focus:ring-1 focus:ring-gold/40" />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-xs text-ink-soft">$</span>
                            <input type="number" min="0" step="0.01"
                              value={seleccion[a.id_articulo]?.precio_unitario || 0}
                              onChange={e => actualizarSeleccion(a.id_articulo, "precio_unitario", e.target.value)}
                              className="w-20 text-center text-xs border border-line rounded py-1 focus:outline-none focus:ring-1 focus:ring-gold/40" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalNueva(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar renta"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal cotización PDF */}
      <Modal abierto={!!modalPdf} onCerrar={() => setModalPdf(null)} titulo="Cotización para cliente">
        <form onSubmit={exportarCotizacion} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Los precios se toman de lo que capturaste al crear la renta.
            Si cambiaron, puedes crear una renta nueva con los precios actualizados.
          </p>
          <Campo etiqueta="Flete ($0 si no aplica)">
            <Input type="number" min="0" step="0.01"
              value={fleteRenta} onChange={e => setFleteRenta(e.target.value)} />
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalPdf(null)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit">Generar PDF</Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
}