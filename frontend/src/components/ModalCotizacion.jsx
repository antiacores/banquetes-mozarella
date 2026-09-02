import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Modal, Campo, Input, Boton } from "./ui";
import { abrirPdf } from "../lib/pdf";
import { api } from "../lib/api";

const EXTRAS_PREDEFINIDOS = ["Pista", "Carpa", "Cócteles"];

/**
 * Modal de cotización reutilizable.
 * Props:
 *   abierto    — boolean
 *   onCerrar   — función
 *   urlPdf     — string con el endpoint, ej: "/pdf/evento/5/cotizacion"
 */
export default function ModalCotizacion({ abierto, onCerrar, urlPdf }) {
  const [flete,    setFlete]    = useState("");
  const [pista,    setPista]    = useState("");
  const [carpa,    setCarpa]    = useState("");
  const [cocteles, setCocteles] = useState("");
  const [extras,   setExtras]   = useState([]); // { nombre, monto }

  function agregarExtra() {
    setExtras(prev => [...prev, { nombre: "", monto: "" }]);
  }

  function actualizarExtra(idx, campo, valor) {
    setExtras(prev => prev.map((e, i) => i === idx ? { ...e, [campo]: valor } : e));
  }

  function quitarExtra(idx) {
    setExtras(prev => prev.filter((_, i) => i !== idx));
  }

  function cerrar() {
    setFlete(""); setPista(""); setCarpa(""); setCocteles("");
    setExtras([]);
    onCerrar();
  }

  async function generarPdf(e) {
    e.preventDefault();
    const payload = {
      flete:    parseFloat(flete)    || 0,
      pista:    parseFloat(pista)    || 0,
      carpa:    parseFloat(carpa)    || 0,
      cocteles: parseFloat(cocteles) || 0,
      extras: extras
        .filter(ex => ex.nombre && parseFloat(ex.monto) > 0)
        .map(ex => ({ nombre: ex.nombre, monto: parseFloat(ex.monto) })),
    };
    try {
      const response = await api.post(urlPdf, payload, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      window.open(objectUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      cerrar();
    } catch {
      alert("No se pudo generar el PDF.");
    }
  }

  return (
    <Modal abierto={abierto} onCerrar={cerrar} titulo="Cotización para cliente">
      <form onSubmit={generarPdf} className="flex flex-col gap-4">
        <p className="text-sm text-ink-soft">
          Los precios de artículos se toman del inventario o del precio especial del evento.
          Agrega los extras que apliquen — solo aparecen en el PDF si tienen monto.
        </p>

        {/* Extras predefinidos */}
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Flete ($0 si no aplica)">
            <Input type="number" min="0" step="0.01" value={flete}
              onChange={e => setFlete(e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Pista">
            <Input type="number" min="0" step="0.01" value={pista}
              onChange={e => setPista(e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Carpa">
            <Input type="number" min="0" step="0.01" value={carpa}
              onChange={e => setCarpa(e.target.value)} placeholder="0" />
          </Campo>
          <Campo etiqueta="Cócteles">
            <Input type="number" min="0" step="0.01" value={cocteles}
              onChange={e => setCocteles(e.target.value)} placeholder="0" />
          </Campo>
        </div>

        {/* Extras libres */}
        {extras.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-ink-soft">Otros extras</p>
            {extras.map((ex, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <Input
                  placeholder="Nombre del extra"
                  value={ex.nombre}
                  onChange={e => actualizarExtra(idx, "nombre", e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number" min="0" step="0.01"
                  placeholder="$0"
                  value={ex.monto}
                  onChange={e => actualizarExtra(idx, "monto", e.target.value)}
                  className="w-28"
                />
                <button type="button" onClick={() => quitarExtra(idx)}
                  className="text-ink-soft hover:text-alert p-1">
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={agregarExtra}
          className="flex items-center gap-1.5 text-xs text-gold-deep hover:underline self-start">
          <Plus size={13} /> Agregar otro extra
        </button>

        <div className="flex justify-end gap-2 pt-2">
          <Boton variante="fantasma" type="button" onClick={cerrar}>Cancelar</Boton>
          <Boton variante="dorado" type="submit">Generar PDF</Boton>
        </div>
      </form>
    </Modal>
  );
}