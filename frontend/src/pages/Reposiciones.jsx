import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { listarReposiciones, listarArticulos, listarProveedores, registrarReposicion } from "../lib/api";
import { Boton, Modal, Campo, Input, Select } from "../components/ui";

const VACIO = { id_articulo: "", id_proveedor: "", cantidad: "", costo_total: "", notas: "" };

export default function Reposiciones() {
  const [reposiciones, setReposiciones] = useState([]);
  const [articulos, setArticulos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const [r, a, p] = await Promise.all([listarReposiciones(), listarArticulos(), listarProveedores()]);
      setReposiciones(r);
      setArticulos(a);
      setProveedores(p);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardar(e) {
    e.preventDefault();
    setGuardando(true);
    try {
      await registrarReposicion({
        id_articulo: Number(form.id_articulo),
        id_proveedor: Number(form.id_proveedor),
        cantidad: Number(form.cantidad),
        costo_total: form.costo_total === "" ? null : Number(form.costo_total),
        notas: form.notas,
      });
      setModalAbierto(false);
      setForm(VACIO);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Ocurrió un error al registrar la reposición.");
    } finally {
      setGuardando(false);
    }
  }

  function nombreArticulo(id) {
    return articulos.find((a) => a.id_articulo === id)?.nombre || `Artículo #${id}`;
  }

  function nombreProveedor(id) {
    return proveedores.find((p) => p.id_proveedor === id)?.nombre || `Proveedor #${id}`;
  }

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-ink-soft">Cargando...</p></div>;
  }

  return (
    <div className="px-6 py-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">Compras</p>
          <h1 className="font-display text-2xl font-semibold">Reposiciones</h1>
        </div>
        <Boton variante="dorado" onClick={() => setModalAbierto(true)}>
          <span className="flex items-center gap-1.5"><Plus size={16} /> Nueva reposición</span>
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
              <th className="px-4 py-3 font-medium">Proveedor</th>
              <th className="px-4 py-3 font-medium text-right">Cantidad</th>
              <th className="px-4 py-3 font-medium text-right">Costo total</th>
              <th className="px-4 py-3 font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {reposiciones.map((r) => (
              <tr key={r.id_reposicion} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium">{nombreArticulo(r.id_articulo)}</td>
                <td className="px-4 py-3 text-ink-soft">{nombreProveedor(r.id_proveedor)}</td>
                <td className="px-4 py-3 text-right">{r.cantidad}</td>
                <td className="px-4 py-3 text-right">
                  {r.costo_total ? `$${Number(r.costo_total).toLocaleString("es-MX")}` : "—"}
                </td>
                <td className="px-4 py-3 text-ink-soft">
                  {new Date(r.fecha + "T00:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                </td>
              </tr>
            ))}
            {reposiciones.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No hay reposiciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo="Nueva reposición">
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <Campo etiqueta="Artículo">
            <Select
              required
              value={form.id_articulo}
              onChange={(e) => setForm({ ...form, id_articulo: e.target.value })}
            >
              <option value="">Selecciona un artículo</option>
              {articulos.map((a) => (
                <option key={a.id_articulo} value={a.id_articulo}>{a.nombre}</option>
              ))}
            </Select>
          </Campo>
          <Campo etiqueta="Proveedor">
            <Select
              required
              value={form.id_proveedor}
              onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
              ))}
            </Select>
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Cantidad">
              <Input
                type="number" min="1" required
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
              />
            </Campo>
            <Campo etiqueta="Costo total (opcional)">
              <Input
                type="number" min="0" step="0.01"
                value={form.costo_total}
                onChange={(e) => setForm({ ...form, costo_total: e.target.value })}
              />
            </Campo>
          </div>
          <Campo etiqueta="Notas (opcional)">
            <Input
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
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
    </div>
  );
}
