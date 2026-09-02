import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ChevronRight, Phone, Mail } from "lucide-react";
import { api } from "../lib/api";
import { Boton, Modal, Campo, Input, Badge } from "../components/ui";

const VACIO = { nombre: "", telefono: "", correo: "", direccion: "", notas: "" };

const TONO_ESTADO = {
  confirmado: "bueno", pendiente: "dorado",
  cotizacion: "neutro", finalizado: "neutro", cancelado: "alerta",
};

export default function Clientes() {
  const [clientes, setClientes]     = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);
  const [busqueda, setBusqueda]     = useState("");

  const [modalForm, setModalForm]   = useState(false);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(VACIO);
  const [guardando, setGuardando]   = useState(false);

  const [detalle, setDetalle]       = useState(null); // cliente seleccionado
  const [confirmarEliminar, setConfirmarEliminar] = useState(null);

  async function cargar() {
    try {
      const { data } = await api.get("/clientes/");
      setClientes(data);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, []);

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setModalForm(true);
  }

  function abrirEditar(c) {
    setEditando(c);
    setForm({
      nombre: c.nombre, telefono: c.telefono || "",
      correo: c.correo || "", direccion: c.direccion || "", notas: c.notas || "",
    });
    setModalForm(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) await api.put(`/clientes/${editando.id_cliente}`, form);
      else await api.post("/clientes/", form);
      setModalForm(false);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/clientes/${id}`);
      setConfirmarEliminar(null);
      setDetalle(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al eliminar.");
    }
  }

  async function verDetalle(id) {
    try {
      const { data } = await api.get(`/clientes/${id}`);
      setDetalle(data);
    } catch {
      alert("No se pudo cargar el cliente.");
    }
  }

  const clientesFiltrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono || "").includes(busqueda) ||
    (c.correo || "").toLowerCase().includes(busqueda.toLowerCase())
  );

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
          <h1 className="font-display text-2xl font-semibold">Clientes</h1>
        </div>
        <Boton variante="dorado" onClick={abrirNuevo}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Nuevo cliente</span>
        </Boton>
      </div>

      {error && <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}

      {/* Búsqueda */}
      <input
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre, teléfono o correo..."
        className="w-full max-w-sm px-3 py-2 rounded-lg border border-line bg-paper text-sm
                   focus:outline-none focus:ring-2 focus:ring-gold/40 mb-4"
      />

      {/* Lista */}
      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        {clientesFiltrados.length === 0 ? (
          <p className="px-4 py-8 text-center text-ink-soft text-sm">No hay clientes registrados.</p>
        ) : (
          <div className="flex flex-col">
            {clientesFiltrados.map(c => (
              <div key={c.id_cliente}
                className="flex items-center gap-3 px-4 py-3.5 border-b border-line last:border-0
                           hover:bg-mist/50 group">
                <button
                  onClick={() => verDetalle(c.id_cliente)}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="text-sm font-medium">{c.nombre}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {c.telefono && (
                      <span className="text-xs text-ink-soft flex items-center gap-1">
                        <Phone size={11} /> {c.telefono}
                      </span>
                    )}
                    {c.correo && (
                      <span className="text-xs text-ink-soft flex items-center gap-1">
                        <Mail size={11} /> {c.correo}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {c.total_eventos > 0 && (
                    <span className="text-xs text-ink-soft">
                      {c.total_eventos} evento{c.total_eventos !== 1 ? "s" : ""}
                    </span>
                  )}
                  <button onClick={() => abrirEditar(c)}
                    className="p-1.5 rounded hover:bg-mist text-ink-soft hover:text-ink
                               opacity-0 group-hover:opacity-100 transition-opacity">
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmarEliminar({ id: c.id_cliente, nombre: c.nombre })}
                    className="p-1.5 rounded hover:bg-alert-pale text-ink-soft hover:text-alert
                               opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => verDetalle(c.id_cliente)}>
                    <ChevronRight size={16} className="text-ink-soft" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Modal abierto={modalForm} onCerrar={() => setModalForm(false)}
        titulo={editando ? "Editar cliente" : "Nuevo cliente"}>
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Campo etiqueta="Nombre">
            <Input required value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Teléfono">
              <Input value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })} />
            </Campo>
            <Campo etiqueta="Correo">
              <Input type="email" value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })} />
            </Campo>
          </div>
          <Campo etiqueta="Dirección">
            <Input value={form.direccion}
              onChange={e => setForm({ ...form, direccion: e.target.value })} />
          </Campo>
          <Campo etiqueta="Notas">
            <Input value={form.notas}
              onChange={e => setForm({ ...form, notas: e.target.value })} />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalForm(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal detalle del cliente */}
      <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)}
        titulo={detalle?.nombre || ""}>
        {detalle && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              {detalle.telefono && (
                <p className="text-sm flex items-center gap-2 text-ink-soft">
                  <Phone size={14} /> {detalle.telefono}
                </p>
              )}
              {detalle.correo && (
                <p className="text-sm flex items-center gap-2 text-ink-soft">
                  <Mail size={14} /> {detalle.correo}
                </p>
              )}
              {detalle.notas && (
                <p className="text-sm text-ink-soft mt-1">{detalle.notas}</p>
              )}
            </div>

            {/* Historial de eventos */}
            {detalle.eventos?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-ink-soft uppercase tracking-wide mb-2">
                  Historial de eventos
                </p>
                <div className="flex flex-col gap-1.5">
                  {detalle.eventos.map(ev => (
                    <div key={ev.id_evento}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-mist">
                      <div>
                        <p className="text-sm font-medium">{ev.tipo}</p>
                        <p className="text-xs text-ink-soft">
                          {new Date(ev.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                            day: "numeric", month: "long", year: "numeric"
                          })}
                        </p>
                      </div>
                      <Badge tono={TONO_ESTADO[ev.estado] || "neutro"}>{ev.estado}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Boton variante="fantasma" onClick={() => setDetalle(null)}>Cerrar</Boton>
              <Boton variante="dorado" onClick={() => { abrirEditar(detalle); setDetalle(null); }}>
                Editar
              </Boton>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirmar eliminar */}
      <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)}
        titulo="Eliminar cliente">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            ¿Segura que quieres eliminar a{" "}
            <span className="font-medium text-ink">"{confirmarEliminar?.nombre}"</span>?
            Los eventos asociados no se eliminarán, solo se desvinculan del cliente.
          </p>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" onClick={() => setConfirmarEliminar(null)}>Cancelar</Boton>
            <Boton variante="peligro" onClick={() => eliminar(confirmarEliminar.id)}>
              Eliminar
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  );
}