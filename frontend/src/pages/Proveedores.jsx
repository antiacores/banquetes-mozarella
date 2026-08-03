import { useEffect, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { listarProveedores, crearProveedor, actualizarProveedor } from "../lib/api";
import { Boton, Modal, Campo, Input, TextArea } from "../components/ui";

const VACIO = { nombre: "", telefono: "", correo: "", notas: "" };

export default function Proveedores() {
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const data = await listarProveedores();
      setProveedores(data);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setModalAbierto(true);
  }

  function abrirEditar(p) {
    setEditando(p);
    setForm({ nombre: p.nombre, telefono: p.telefono || "", correo: p.correo || "", notas: p.notas || "" });
    setModalAbierto(true);
  }

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await actualizarProveedor(editando.id_proveedor, form);
      } else {
        await crearProveedor(form);
      }
      setModalAbierto(false);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Ocurrió un error al guardar.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-soft">Cargando...</p></div>;
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Compras</p>
          <h1 className="font-display text-2xl font-semibold">Proveedores</h1>
        </div>
        <Boton variante="dorado" onClick={abrirNuevo}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Nuevo proveedor</span>
        </Boton>
      </div>

      {error && (
        <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {proveedores.map((p) => (
          <div key={p.id_proveedor} className="bg-paper rounded-xl border border-line p-4 flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{p.nombre}</p>
              {p.telefono && <p className="text-xs text-ink-soft mt-0.5">{p.telefono}</p>}
              {p.correo && <p className="text-xs text-ink-soft">{p.correo}</p>}
              {p.notas && <p className="text-xs text-ink-soft mt-1">{p.notas}</p>}
            </div>
            <button onClick={() => abrirEditar(p)} className="text-ink-soft hover:text-gold-deep shrink-0">
              <Pencil size={15} />
            </button>
          </div>
        ))}
        {proveedores.length === 0 && (
          <p className="text-sm text-ink-soft col-span-2 text-center py-8">No hay proveedores registrados.</p>
        )}
      </div>

      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        titulo={editando ? "Editar proveedor" : "Nuevo proveedor"}
      >
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Campo etiqueta="Nombre">
            <Input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Teléfono">
              <Input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Correo">
              <Input
                type="email"
                value={form.correo}
                onChange={(e) => setForm({ ...form, correo: e.target.value })}
              />
            </Campo>
          </div>
          <Campo etiqueta="Notas">
            <TextArea
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </Campo>
          <div className="flex justify-end gap-2 pt-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Boton>
            <Boton variante="dorado" type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar"}
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
