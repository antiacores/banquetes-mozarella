import { useEffect, useState } from "react";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import { api } from "../lib/api";
import { Boton } from "./ui";

/**
 * Lista de cajón editable por evento.
 * Se carga automáticamente desde la plantilla la primera vez.
 * Props:
 *   idEvento   — number
 *   soloLectura — boolean (para perfil almacén)
 */
export default function ListaCajon({ idEvento, soloLectura = false }) {
  const [items, setItems]       = useState([]);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState({}); // { id_cajon: true }

  async function cargar() {
    try {
      const { data } = await api.get(`/cajon/evento/${idEvento}`);
      setItems(data);
    } catch {
      // silencioso
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [idEvento]);

  async function actualizar(id, campo, valor) {
    try {
      await api.put(`/cajon/${id}`, { [campo]: valor === "" ? null : valor });
      setItems(prev => prev.map(i => i.id_cajon === id ? { ...i, [campo]: valor } : i));
    } catch {
      alert("Error al guardar.");
    }
  }

  async function agregar() {
    try {
      const { data } = await api.post(`/cajon/evento/${idEvento}`, {
        nombre: "Nuevo artículo",
        orden: items.length + 1,
      });
      setItems(prev => [...prev, data]);
      setEditando(prev => ({ ...prev, [data.id_cajon]: true }));
    } catch {
      alert("Error al agregar.");
    }
  }

  async function eliminar(id) {
    try {
      await api.delete(`/cajon/${id}`);
      setItems(prev => prev.filter(i => i.id_cajon !== id));
    } catch {
      alert("Error al eliminar.");
    }
  }

  async function resetear() {
    if (!confirm("¿Resetear la lista al estado inicial? Se perderán los cambios.")) return;
    try {
      await api.delete(`/cajon/evento/${idEvento}/reset`);
      setCargando(true);
      await cargar();
    } catch {
      alert("Error al resetear.");
    }
  }

  if (cargando) return <p className="text-sm text-ink-soft py-4">Cargando lista de cajón...</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">Lista de cajón</h3>
        {!soloLectura && (
          <div className="flex gap-2">
            <button onClick={resetear}
              className="flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
              title="Resetear a plantilla original">
              <RotateCcw size={13} /> Resetear
            </button>
            <Boton variante="fantasma" onClick={agregar}>
              <span className="flex items-center gap-1"><Plus size={13} /> Agregar</span>
            </Boton>
          </div>
        )}
      </div>

      <div className="bg-paper rounded-xl border border-line overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Artículo</th>
              <th className="px-3 py-2.5 font-medium text-right">Cantidad</th>
              <th className="px-3 py-2.5 font-medium">Modelo/Color</th>
              {!soloLectura && <th className="px-3 py-2.5"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id_cajon}
                className="border-b border-line last:border-0 group hover:bg-mist/30">
                <td className="px-3 py-2 text-xs text-ink-soft">{idx + 1}</td>

                {/* Nombre editable */}
                <td className="px-3 py-2">
                  {!soloLectura ? (
                    <input
                      value={item.nombre}
                      onChange={e => setItems(prev =>
                        prev.map(i => i.id_cajon === item.id_cajon
                          ? { ...i, nombre: e.target.value } : i)
                      )}
                      onBlur={e => actualizar(item.id_cajon, "nombre", e.target.value)}
                      className="w-full text-sm bg-transparent border-b border-transparent
                                 hover:border-line focus:border-gold focus:outline-none py-0.5"
                    />
                  ) : (
                    <span className="text-sm">{item.nombre}</span>
                  )}
                </td>

                {/* Cantidad editable */}
                <td className="px-3 py-2 text-right">
                  {!soloLectura ? (
                    <input
                      type="number" min="0"
                      value={item.cantidad ?? ""}
                      onChange={e => setItems(prev =>
                        prev.map(i => i.id_cajon === item.id_cajon
                          ? { ...i, cantidad: e.target.value } : i)
                      )}
                      onBlur={e => actualizar(item.id_cajon, "cantidad",
                        e.target.value === "" ? null : Number(e.target.value))}
                      placeholder="—"
                      className="w-16 text-right text-sm bg-transparent border-b border-transparent
                                 hover:border-line focus:border-gold focus:outline-none py-0.5"
                    />
                  ) : (
                    <span className="text-sm">{item.cantidad ?? "—"}</span>
                  )}
                </td>

                {/* Modelo/Color editable */}
                <td className="px-3 py-2">
                  {!soloLectura ? (
                    <input
                      value={item.modelo_color ?? ""}
                      onChange={e => setItems(prev =>
                        prev.map(i => i.id_cajon === item.id_cajon
                          ? { ...i, modelo_color: e.target.value } : i)
                      )}
                      onBlur={e => actualizar(item.id_cajon, "modelo_color", e.target.value)}
                      placeholder="—"
                      className="w-full text-sm bg-transparent border-b border-transparent
                                 hover:border-line focus:border-gold focus:outline-none py-0.5"
                    />
                  ) : (
                    <span className="text-sm text-ink-soft">{item.modelo_color || "—"}</span>
                  )}
                </td>

                {!soloLectura && (
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => eliminar(item.id_cajon)}
                      className="text-ink-soft hover:text-alert opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-soft">
        Click en cualquier celda para editar. Los cambios se guardan automáticamente.
      </p>
    </div>
  );
}