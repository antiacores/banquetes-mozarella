import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { listarBajas, listarArticulos, listarEventos, registrarBaja } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, Badge } from "../components/ui";

const VACIO = { id_articulo: "", id_evento: "", cantidad: "", motivo: "roto", descripcion: "" };

const TONO_MOTIVO = {
  roto: "alerta", perdido: "alerta", desgaste: "dorado", otro: "neutro",
};

export default function Bajas() {
  const [bajas, setBajas]         = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [eventos, setEventos]     = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm]                 = useState(VACIO);
  const [guardando, setGuardando]       = useState(false);

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  async function cargar() {
    try {
      const [b, a, e] = await Promise.all([
        listarBajas(), listarArticulos(), listarEventos()
      ]);
      setBajas(b);
      setArticulos(a);
      setEventos(e);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await registrarBaja({
        id_articulo:  Number(form.id_articulo),
        id_evento:    form.id_evento ? Number(form.id_evento) : null,
        cantidad:     Number(form.cantidad),
        motivo:       form.motivo,
        descripcion:  form.descripcion,
      });
      setModalAbierto(false);
      setForm(VACIO);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Ocurrió un error al registrar la baja.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarBaja(id) {
    try {
      await api.delete(`/bajas/${id}`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.");
    }
  }

  function nombreArticulo(id) {
    return articulos.find(a => a.id_articulo === id)?.nombre || `Artículo #${id}`;
  }

  function nombreEvento(id) {
    if (!id) return "Sin evento (bodega)";
    const ev = eventos.find(e => e.id_evento === id);
    return ev ? `${ev.tipo} · ${ev.nombre_cliente || "sin nombre"}` : `Evento #${id}`;
  }

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-soft">Cargando...</p>
    </div>
  );

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Inventario</p>
          <h1 className="font-display text-2xl font-semibold">Bajas</h1>
        </div>
        <Boton variante="dorado" onClick={() => setModalAbierto(true)}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Registrar baja</span>
        </Boton>
      </div>

      {error && (
        <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Artículo</th>
              <th className="px-4 py-3 font-medium text-right">Cantidad</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Evento</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bajas.map(b => (
              <tr key={b.id_baja} className="border-b border-line last:border-0 group hover:bg-mist/50">
                <td className="px-4 py-3 font-medium">{nombreArticulo(b.id_articulo)}</td>
                <td className="px-4 py-3 text-right">{b.cantidad}</td>
                <td className="px-4 py-3">
                  <Badge tono={TONO_MOTIVO[b.motivo]}>{b.motivo}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-soft text-xs">{nombreEvento(b.id_evento)}</td>
                <td className="px-4 py-3 text-ink-soft">
                  {new Date(b.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                    day: "numeric", month: "short", year: "numeric"
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setConfirmarEliminar(b)}
                    className="text-ink-soft hover:text-alert opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar baja"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {bajas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  No hay bajas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal registrar baja */}
      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Registrar baja">
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Campo etiqueta="Artículo">
            <Select required value={form.id_articulo}
              onChange={e => setForm({ ...form, id_articulo: e.target.value })}>
              <option value="">Selecciona un artículo</option>
              {articulos.map(a => (
                <option key={a.id_articulo} value={a.id_articulo}>
                  {a.nombre} ({a.cantidad_total} en total)
                </option>
              ))}
            </Select>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Cantidad">
              <Input type="number" min="1" required value={form.cantidad}
                onChange={e => setForm({ ...form, cantidad: e.target.value })} />
            </Campo>
            <Campo etiqueta="Motivo">
              <Select value={form.motivo}
                onChange={e => setForm({ ...form, motivo: e.target.value })}>
                <option value="roto">Roto</option>
                <option value="perdido">Perdido</option>
                <option value="desgaste">Desgaste</option>
                <option value="otro">Otro</option>
              </Select>
            </Campo>
          </div>
          <Campo etiqueta="Evento relacionado (opcional)">
            <Select value={form.id_evento}
              onChange={e => setForm({ ...form, id_evento: e.target.value })}>
              <option value="">Sin evento (baja en bodega)</option>
              {eventos.map(e => (
                <option key={e.id_evento} value={e.id_evento}>
                  {e.tipo} · {e.nombre_cliente || "sin nombre"} ({e.fecha})
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Descripción (opcional)">
            <Input value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Registrar"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)}
        titulo="Eliminar baja">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            ¿Segura que quieres eliminar esta baja?
            <br />
            <span className="font-medium text-ink">
              {confirmarEliminar ? nombreArticulo(confirmarEliminar.id_articulo) : ""} · {confirmarEliminar?.cantidad} pzas · {confirmarEliminar?.motivo}
            </span>
            <br /><br />
            El inventario se revertirá automáticamente ({confirmarEliminar?.cantidad} piezas
            regresarán al inventario).
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmarEliminar(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => eliminarBaja(confirmarEliminar.id_baja)}>
              Eliminar y revertir
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}