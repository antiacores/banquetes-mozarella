import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { listarEventos, crearEvento } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Select, TextArea, Badge } from "../components/ui";
import { useAuth, esJefe } from "../lib/AuthContext";

const VACIO = {
  nombre_cliente: "", fecha: "", tipo: "",
  lugar: "", num_invitados: "", estado: "cotizacion",
  observaciones: "", id_cliente: "",
};

const TONO_ESTADO = {
  confirmado: "bueno", pendiente: "dorado",
  cotizacion: "neutro", finalizado: "neutro", cancelado: "alerta",
};

const ESTADOS = ["cotizacion", "pendiente", "confirmado", "cancelado"];

export default function Eventos() {
  const { usuario } = useAuth();
  const puedeEditar = esJefe(usuario);
  const navigate    = useNavigate();

  const [eventos, setEventos]   = useState([]);
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError]       = useState(null);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [form, setForm]             = useState(VACIO);
  const [guardando, setGuardando]   = useState(false);

  const [editandoEstado, setEditandoEstado] = useState(null);
  const [nuevoEstado, setNuevoEstado]       = useState("");

  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  async function cargar() {
    try {
      const [data, clientesData] = await Promise.all([
        listarEventos(),
        api.get("/clientes/").then(r => r.data),
      ]);
      setEventos(data);
      setClientes(clientesData);
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
      await crearEvento({
        ...form,
        num_invitados: form.num_invitados === "" ? null : Number(form.num_invitados),
        id_cliente:    form.id_cliente    ? Number(form.id_cliente) : null,
      });
      setModalNuevo(false);
      setForm(VACIO);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEstado(e) {
    e.preventDefault();
    try {
      await api.put(`/eventos/${editandoEstado.id_evento}`, { estado: nuevoEstado });
      setEditandoEstado(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al actualizar.");
    }
  }

  async function eliminarEvento(id) {
    try {
      await api.delete(`/eventos/${id}`);
      setConfirmarEliminar(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.");
    }
  }

  function formatearFecha(fechaStr) {
    const f = new Date(fechaStr + "T00:00:00");
    return {
      dia: f.toLocaleDateString("es-MX", { day: "numeric" }),
      mes: f.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
    };
  }

  const eventosActivos     = eventos.filter(ev => ev.estado !== "finalizado");
  const eventosFinalizados = eventos.filter(ev => ev.estado === "finalizado");

  function FilaEvento({ ev }) {
    const { dia, mes } = formatearFecha(ev.fecha);
    const esFinalizado = ev.estado === "finalizado";

    return (
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0 hover:bg-mist/50 group">
        <button
          onClick={() => navigate(`/eventos/${ev.id_evento}`)}
          className="flex items-center gap-4 min-w-0 flex-1 text-left"
        >
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-mist shrink-0">
            <span className="text-[10px] uppercase text-ink-soft leading-none font-medium">{mes}</span>
            <span className="font-display text-sm font-semibold leading-tight">{dia}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{ev.nombre_cliente || "Sin nombre de cliente"}</p>
            <p className="text-xs text-ink-soft truncate">
              {ev.tipo} · {ev.lugar || "Sin lugar"} · {ev.num_invitados ?? "?"} invitados
            </p>
          </div>
        </button>

        {puedeEditar && !esFinalizado ? (
          <button
            onClick={() => { setEditandoEstado(ev); setNuevoEstado(ev.estado); }}
            className="shrink-0 group/estado" title="Cambiar estado"
          >
            <Badge tono={TONO_ESTADO[ev.estado] || "neutro"}>
              {ev.estado}
              <Pencil size={10} className="inline ml-1 opacity-0 group-hover/estado:opacity-60" />
            </Badge>
          </button>
        ) : (
          <Badge tono={TONO_ESTADO[ev.estado] || "neutro"}>{ev.estado}</Badge>
        )}

        <button onClick={() => navigate(`/eventos/${ev.id_evento}`)}>
          <ChevronRight size={16} className="text-ink-soft" />
        </button>

        {puedeEditar && (
          <button
            onClick={() => setConfirmarEliminar({ id: ev.id_evento, nombre: ev.nombre_cliente || "este evento" })}
            className="text-ink-soft hover:text-alert opacity-0 group-hover:opacity-100 transition-opacity"
            title="Eliminar evento"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    );
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
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Operación</p>
          <h1 className="font-display text-2xl font-semibold">Eventos</h1>
        </div>
        {puedeEditar && (
          <Boton variante="dorado" onClick={() => setModalNuevo(true)}>
            <span className="flex items-center gap-1.5"><Plus size={16} /> Nuevo evento</span>
          </Boton>
        )}
      </div>

      {error && <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {/* Eventos activos */}
      <div className="bg-paper rounded-xl border border-line overflow-hidden mb-6">
        {eventosActivos.length === 0 ? (
          <p className="px-4 py-8 text-center text-ink-soft text-sm">No hay eventos activos.</p>
        ) : (
          <div className="flex flex-col">
            {eventosActivos.map(ev => <FilaEvento key={ev.id_evento} ev={ev} />)}
          </div>
        )}
      </div>

      {/* Eventos finalizados */}
      {eventosFinalizados.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">
              Eventos finalizados
            </span>
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-ink-soft">{eventosFinalizados.length}</span>
          </div>
          <div className="bg-paper rounded-xl border border-line overflow-hidden opacity-75">
            <div className="flex flex-col">
              {eventosFinalizados.map(ev => <FilaEvento key={ev.id_evento} ev={ev} />)}
            </div>
          </div>
        </div>
      )}

      {/* Modal nuevo evento */}
      <Modal abierto={modalNuevo} onCerrar={() => setModalNuevo(false)} titulo="Nuevo evento">
        <form onSubmit={guardar} className="flex flex-col gap-4">
          {/* Selector de cliente registrado */}
          <Campo etiqueta="Cliente (opcional)">
            <Select value={form.id_cliente}
              onChange={e => {
                const sel = clientes.find(c => c.id_cliente === Number(e.target.value));
                setForm({
                  ...form,
                  id_cliente: e.target.value,
                  nombre_cliente: sel ? sel.nombre : form.nombre_cliente,
                });
              }}>
              <option value="">Sin cliente registrado</option>
              {clientes.map(c => (
                <option key={c.id_cliente} value={c.id_cliente}>{c.nombre}</option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Nombre del cliente">
            <Input value={form.nombre_cliente}
              onChange={e => setForm({ ...form, nombre_cliente: e.target.value })}
              placeholder="Ej. Familia Pérez" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Fecha">
              <Input type="date" required value={form.fecha}
                onChange={e => setForm({ ...form, fecha: e.target.value })} />
            </Campo>
            <Campo etiqueta="Tipo de evento">
              <Input required value={form.tipo}
                onChange={e => setForm({ ...form, tipo: e.target.value })}
                placeholder="Boda, XV años, corporativo..." />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Lugar">
              <Input value={form.lugar}
                onChange={e => setForm({ ...form, lugar: e.target.value })} />
            </Campo>
            <Campo etiqueta="Número de invitados">
              <Input type="number" min="0" value={form.num_invitados}
                onChange={e => setForm({ ...form, num_invitados: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Estado inicial">
            <Select value={form.estado} onChange={e => setForm({ ...form, estado: e.target.value })}>
              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Campo>
          <Campo etiqueta="Observaciones">
            <TextArea value={form.observaciones}
              onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalNuevo(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal editar estado */}
      <Modal abierto={!!editandoEstado} onCerrar={() => setEditandoEstado(null)} titulo="Cambiar estado del evento">
        <form onSubmit={guardarEstado} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Evento: <span className="font-medium text-ink">{editandoEstado?.nombre_cliente || "Sin nombre"}</span>
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

      {/* Modal confirmar eliminar */}
      <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)} titulo="Eliminar evento">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            ¿Segura que quieres eliminar{" "}
            <span className="font-medium text-ink">"{confirmarEliminar?.nombre}"</span>?
            Esto también eliminará todos los artículos asignados a este evento.
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmarEliminar(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => eliminarEvento(confirmarEliminar.id)}>
              Eliminar
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}