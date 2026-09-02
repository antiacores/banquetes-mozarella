import { useEffect, useState } from "react";
import { Plus, Trash2, Check, X } from "lucide-react";
import { listarArticulos, listarEventos } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, Badge } from "../components/ui";
import { useAuth, esJefe } from "../lib/AuthContext";

const VACIO = {
  id_articulo: "", id_evento: "", cantidad: "",
  motivo: "roto", descripcion: "", nombre_trabajador: "",
};

const TONO_MOTIVO = {
  roto: "alerta", perdido: "alerta", desgaste: "dorado", otro: "neutro",
};

const TONO_ESTADO_AUTH = {
  pendiente: "dorado", aprobada: "bueno", rechazada: "alerta",
};

export default function Bajas() {
  const { usuario } = useAuth();
  const puedeEditar = esJefe(usuario);

  const [bajas, setBajas]         = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [eventos, setEventos]     = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm]                 = useState(VACIO);
  const [guardando, setGuardando]       = useState(false);

  const [modalAutorizar, setModalAutorizar] = useState(null);
  const [notasJefe, setNotasJefe]           = useState("");

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  async function cargar() {
    try {
      const params = filtroEstado ? { estado: filtroEstado } : {};
      const [b, a, e] = await Promise.all([
        api.get("/bajas/", { params }).then(r => r.data),
        listarArticulos(),
        listarEventos(),
      ]);
      setBajas(b);
      setArticulos(a);
      setEventos(e);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [filtroEstado]);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post("/bajas/", {
        id_articulo:       Number(form.id_articulo),
        id_evento:         form.id_evento ? Number(form.id_evento) : null,
        cantidad:          Number(form.cantidad),
        motivo:            form.motivo,
        descripcion:       form.descripcion,
        nombre_trabajador: form.nombre_trabajador,
      });
      setModalAbierto(false);
      setForm(VACIO);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al registrar.");
    } finally {
      setGuardando(false);
    }
  }

  async function autorizar(id, accion) {
    try {
      await api.put(`/bajas/${id}/autorizar`, { accion, notas_jefe: notasJefe });
      setModalAutorizar(null);
      setNotasJefe("");
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error.");
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/bajas/${id}`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.");
    }
  }

  const pendientes = bajas.filter(b => b.estado_autorizacion === "pendiente").length;

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
          <h1 className="font-display text-2xl font-semibold">
            Bajas
            {pendientes > 0 && puedeEditar && (
              <span className="ml-2 text-sm font-normal text-alert">
                ({pendientes} pendiente{pendientes !== 1 ? "s" : ""})
              </span>
            )}
          </h1>
        </div>
        <Boton variante="dorado" onClick={() => { setForm(VACIO); setModalAbierto(true); }}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Registrar baja</span>
        </Boton>
      </div>

      {/* Filtro por estado — solo jefe */}
      {puedeEditar && (
        <div className="flex gap-2 mb-4">
          {["", "pendiente", "aprobada", "rechazada"].map(estado => (
            <button key={estado}
              onClick={() => setFiltroEstado(estado)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filtroEstado === estado
                  ? "bg-ink text-white"
                  : "bg-mist text-ink-soft hover:bg-paper border border-line"
              }`}>
              {estado === "" ? "Todas" : estado}
            </button>
          ))}
        </div>
      )}

      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Artículo</th>
              <th className="px-4 py-3 font-medium text-right">Cant.</th>
              <th className="px-4 py-3 font-medium">Motivo</th>
              <th className="px-4 py-3 font-medium">Trabajador</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
              {puedeEditar && <th className="px-4 py-3 font-medium">Estado</th>}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {bajas.map(b => (
              <tr key={b.id_baja}
                className={`border-b border-line last:border-0 group hover:bg-mist/50 ${
                  b.estado_autorizacion === "pendiente" ? "bg-gold-pale/20" : ""
                }`}>
                <td className="px-4 py-3 font-medium">{b.nombre_articulo}</td>
                <td className="px-4 py-3 text-right">{b.cantidad}</td>
                <td className="px-4 py-3">
                  <Badge tono={TONO_MOTIVO[b.motivo]}>{b.motivo}</Badge>
                </td>
                <td className="px-4 py-3 text-ink-soft text-xs">
                  {b.nombre_trabajador || "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {new Date(b.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                    day: "numeric", month: "short",
                  })}
                </td>
                {puedeEditar && (
                  <td className="px-4 py-3">
                    {b.estado_autorizacion === "pendiente" ? (
                      <button
                        onClick={() => { setModalAutorizar(b); setNotasJefe(""); }}
                        className="flex items-center gap-1 text-xs font-medium text-gold-deep hover:underline">
                        <Badge tono="dorado">pendiente</Badge>
                      </button>
                    ) : (
                      <Badge tono={TONO_ESTADO_AUTH[b.estado_autorizacion]}>
                        {b.estado_autorizacion}
                      </Badge>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  {puedeEditar && (
                    <button
                      onClick={() => setConfirmarEliminar(b)}
                      className="text-ink-soft hover:text-alert opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bajas.length === 0 && (
              <tr>
                <td colSpan={puedeEditar ? 7 : 6}
                  className="px-4 py-8 text-center text-ink-soft">
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
          {/* Nombre del trabajador — obligatorio para almacén */}
          {!puedeEditar && (
            <Campo etiqueta="Tu nombre completo">
              <Input required value={form.nombre_trabajador}
                placeholder="Escribe tu nombre"
                onChange={e => setForm({ ...form, nombre_trabajador: e.target.value })} />
            </Campo>
          )}
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
              <option value="">Sin evento</option>
              {eventos.map(ev => (
                <option key={ev.id_evento} value={ev.id_evento}>
                  {ev.tipo} · {ev.nombre_cliente || "sin nombre"} ({ev.fecha})
                </option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Descripción (opcional)">
            <Input value={form.descripcion}
              onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </Campo>
          {!puedeEditar && (
            <div className="bg-gold-pale rounded-lg px-3 py-2 text-xs text-gold-deep">
              Tu baja quedará pendiente de autorización del administrador.
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalAbierto(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Registrar"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal autorizar baja — solo jefe */}
      <Modal abierto={!!modalAutorizar} onCerrar={() => setModalAutorizar(null)}
        titulo="Autorizar baja">
        {modalAutorizar && (
          <div className="flex flex-col gap-4">
            <div className="bg-mist rounded-lg px-4 py-3 text-sm">
              <p><span className="text-ink-soft">Artículo:</span> <strong>{modalAutorizar.nombre_articulo}</strong></p>
              <p><span className="text-ink-soft">Cantidad:</span> <strong>{modalAutorizar.cantidad}</strong></p>
              <p><span className="text-ink-soft">Motivo:</span> {modalAutorizar.motivo}</p>
              <p><span className="text-ink-soft">Trabajador:</span> {modalAutorizar.nombre_trabajador || "—"}</p>
              {modalAutorizar.descripcion && (
                <p><span className="text-ink-soft">Descripción:</span> {modalAutorizar.descripcion}</p>
              )}
            </div>
            <Campo etiqueta="Notas del jefe (opcional)">
              <Input value={notasJefe} onChange={e => setNotasJefe(e.target.value)}
                placeholder="Motivo de aprobación o rechazo..." />
            </Campo>
            <div className="flex gap-2 justify-end">
              <Boton variante="fantasma" onClick={() => setModalAutorizar(null)}>Cancelar</Boton>
              <button
                onClick={() => autorizar(modalAutorizar.id_baja, "rechazar")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                           bg-alert-pale text-alert hover:bg-alert/10 transition-colors">
                <X size={15} /> Rechazar
              </button>
              <button
                onClick={() => autorizar(modalAutorizar.id_baja, "aprobar")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium
                           bg-ink text-white hover:bg-ink/90 transition-colors">
                <Check size={15} /> Aprobar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)}
        titulo="Eliminar baja">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            ¿Eliminar esta baja de <span className="font-medium text-ink">
            {confirmarEliminar?.nombre_articulo}</span>?
            {confirmarEliminar?.estado_autorizacion === "aprobada" &&
              " El inventario se revertirá automáticamente."}
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmarEliminar(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => eliminar(confirmarEliminar.id_baja)}>
              Eliminar
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}