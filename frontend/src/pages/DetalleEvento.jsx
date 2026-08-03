import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, AlertTriangle, Download, FileText,
  Pencil, Check, CheckCircle
} from "lucide-react";
import { obtenerEvento, listarCategorias } from "../lib/api";
import { api } from "../lib/api";
import { Boton, Badge, Modal, Campo, Input, Select } from "../components/ui";
import ChecklistInventario from "../components/ChecklistInventario";
import { useAuth, esJefe } from "../lib/AuthContext";
import { abrirPdf } from "../lib/pdf";


const TONO_ESTADO = {
  confirmado: "bueno", pendiente: "dorado",
  cotizacion: "neutro", finalizado: "neutro", cancelado: "alerta",
};

const MOTIVOS_BAJA = [
  { value: "roto",     label: "Roto / dañado" },
  { value: "perdido",  label: "Perdido" },
  { value: "desgaste", label: "Desgaste" },
  { value: "otro",     label: "Otro" },
];

export default function DetalleEvento() {
  const { usuario } = useAuth();
  const puedeEditar = esJefe(usuario);

  const { id } = useParams();
  const navigate = useNavigate();

  const [evento, setEvento]         = useState(null);
  const [detalles, setDetalles]     = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [alertas, setAlertas]       = useState([]);
  const [cargando, setCargando]     = useState(true);
  const [error, setError]           = useState(null);

  const [checklist, setChecklist]               = useState({});
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);

  const [editandoPrecio, setEditandoPrecio] = useState(null);
  const [precioTemp, setPrecioTemp]         = useState("");

  const [modalDevolucion, setModalDevolucion] = useState(null);
  const [cantDevuelta, setCantDevuelta]       = useState("");

  const [modalCotizacion, setModalCotizacion] = useState(false);
  const [flete, setFlete]                     = useState(0);

  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [filasFinalizar, setFilasFinalizar] = useState([]);
  const [finalizando, setFinalizando]       = useState(false);
  const [resultadoFinal, setResultadoFinal] = useState(null);

  async function cargar() {
    try {
      const [ev, dets, cats, al] = await Promise.all([
        obtenerEvento(id),
        api.get(`/detalle-evento/evento/${id}`).then(r => r.data),
        listarCategorias(),
        api.get(`/detalle-evento/evento/${id}/alertas`).then(r => r.data),
      ]);
      setEvento(ev);
      setDetalles(dets);
      setCategorias(cats);
      setAlertas(al.alertas || []);

      const inicial = {};
      dets.forEach(d => { inicial[d.id_articulo] = d.cantidad_asignada; });
      setChecklist(inicial);
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { cargar(); }, [id]);

  function handleChecklistChange(idArticulo, cantidad) {
    setChecklist(prev => ({ ...prev, [idArticulo]: cantidad }));
  }

  async function guardarChecklist() {
    setGuardandoChecklist(true);
    try {
      for (const [idArtStr, cantidad] of Object.entries(checklist)) {
        const idArt = Number(idArtStr);
        if (cantidad <= 0) continue;
        const yaAsignado = detalles.find(d => d.id_articulo === idArt);
        if (yaAsignado) {
          if (yaAsignado.cantidad_asignada !== cantidad)
            await api.put(`/detalle-evento/${yaAsignado.id_detalle}`, { cantidad_asignada: cantidad });
        } else {
          await api.post("/detalle-evento/", {
            id_evento: Number(id), id_articulo: idArt, cantidad_asignada: cantidad
          });
        }
      }
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al guardar.");
    } finally {
      setGuardandoChecklist(false);
    }
  }

  function iniciarEditarPrecio(detalle) {
    setEditandoPrecio(detalle.id_detalle);
    setPrecioTemp(detalle.precio_override != null ? detalle.precio_override : detalle.precio_base || "");
  }

  async function guardarPrecio(idDetalle) {
    try {
      await api.put(`/detalle-evento/${idDetalle}`, {
        precio_override: precioTemp === "" ? null : Number(precioTemp)
      });
      setEditandoPrecio(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error.");
    }
  }

  async function guardarDevolucion(e) {
    e.preventDefault();
    try {
      await api.put(`/detalle-evento/${modalDevolucion.id_detalle}`, {
        cantidad_devuelta: Number(cantDevuelta)
      });
      setModalDevolucion(null);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error.");
    }
  }

  async function eliminarDetalle(idDetalle) {
    if (!confirm("¿Quitar este artículo del evento?")) return;
    try {
      await api.delete(`/detalle-evento/${idDetalle}`);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error.");
    }
  }

  function exportarCotizacion(e) {
  e.preventDefault();
  abrirPdf(`/pdf/evento/${id}/cotizacion?flete=${flete}`);
  setModalCotizacion(false);
}

  function abrirFinalizar() {
    setFilasFinalizar(detalles.map(d => ({
      id_detalle:        d.id_detalle,
      id_articulo:       d.id_articulo,
      nombre_articulo:   d.nombre_articulo,
      cantidad_asignada: d.cantidad_asignada,
      cantidad_devuelta: d.cantidad_devuelta || 0,
      motivo_baja:       "roto",
      descripcion_baja:  "",
    })));
    setResultadoFinal(null);
    setModalFinalizar(true);
  }

  function actualizarFila(idx, campo, valor) {
    setFilasFinalizar(prev => prev.map((f, i) =>
      i === idx ? { ...f, [campo]: valor } : f
    ));
  }

  async function confirmarFinalizar(e) {
    e.preventDefault();
    setFinalizando(true);
    try {
      const { data } = await api.post(`/eventos/${id}/finalizar`, {
        devoluciones: filasFinalizar.map(f => ({
          id_detalle:        f.id_detalle,
          id_articulo:       f.id_articulo,
          cantidad_asignada: f.cantidad_asignada,
          cantidad_devuelta: Number(f.cantidad_devuelta),
          motivo_baja:       f.motivo_baja,
          descripcion_baja:  f.descripcion_baja,
        })),
      });
      setResultadoFinal(data);
      await cargar();
    } catch (err) {
      alert(err?.response?.data?.detail || "Error al finalizar.");
    } finally {
      setFinalizando(false);
    }
  }

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-ink-soft">Cargando...</p>
    </div>
  );
  if (error || !evento) return (
    <div className="px-6 py-8">
      <div className="bg-alert-pale text-alert text-sm rounded-lg px-4 py-3">
        {error || "Evento no encontrado."}
      </div>
    </div>
  );

  const esFinalizado = evento.estado === "finalizado";

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <button onClick={() => navigate("/eventos")}
        className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink mb-4">
        <ArrowLeft size={15} /> Volver a eventos
      </button>

      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-medium text-gold-deep uppercase tracking-wider mb-1">{evento.tipo}</p>
          <h1 className="font-display text-2xl font-semibold">
            {evento.nombre_cliente || "Sin nombre de cliente"}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          {/* PDF trabajadores — ambos perfiles */}
          <Boton variante="fantasma"
            onClick={() => abrirPdf(`/pdf/evento/${id}/trabajadores`)}>
            <span className="flex items-center gap-1.5"><Download size={15} /> Trabajadores</span>
          </Boton>

          {/* Cotización — solo jefe */}
          {puedeEditar && (
            <Boton variante="fantasma" onClick={() => setModalCotizacion(true)}>
              <span className="flex items-center gap-1.5"><FileText size={15} /> Cotización</span>
            </Boton>
          )}

          {/* Finalizar — solo jefe */}
          {puedeEditar && !esFinalizado && detalles.length > 0 && (
            <Boton variante="dorado" onClick={abrirFinalizar}>
              <span className="flex items-center gap-1.5">
                <CheckCircle size={15} /> Finalizar evento
              </span>
            </Boton>
          )}
        </div>
      </div>

      <p className="text-sm text-ink-soft mb-6 flex items-center gap-2 flex-wrap">
        {new Date(evento.fecha + "T00:00:00").toLocaleDateString("es-MX", {
          day: "numeric", month: "long", year: "numeric"
        })}
        {" · "}{evento.lugar || "Sin lugar"}
        {" · "}{evento.num_invitados ?? "?"} invitados
        {" · "}
        <Badge tono={TONO_ESTADO[evento.estado] || "neutro"}>{evento.estado}</Badge>
      </p>

      {alertas.length > 0 && (
        <div className="bg-alert-pale rounded-xl border border-alert/20 p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-alert" />
            <p className="text-sm font-medium text-alert">Stock insuficiente para este evento</p>
          </div>
          {alertas.map((a, i) => (
            <p key={i} className="text-sm text-ink-soft">
              <span className="font-medium text-ink">{a.nombre_articulo}</span>: pediste {a.cantidad_solicitada},
              hay {a.cantidad_disponible} disponibles (faltan{" "}
              <span className="font-medium text-alert">{a.faltante}</span>)
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Checklist — solo jefe y solo si no está finalizado */}
        {puedeEditar && !esFinalizado && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-base font-semibold">Seleccionar artículos</h2>
              <Boton variante="dorado" onClick={guardarChecklist} disabled={guardandoChecklist}>
                {guardandoChecklist ? "Guardando..." : "Guardar selección"}
              </Boton>
            </div>
            <ChecklistInventario
              categorias={categorias}
              checklist={checklist}
              onChange={handleChecklistChange}
            />
          </div>
        )}

        {/* Artículos asignados */}
        <div className={puedeEditar && !esFinalizado ? "" : "lg:col-span-2"}>
          <h2 className="font-display text-base font-semibold mb-3">
            Artículos asignados
            {detalles.length > 0 && (
              <span className="ml-2 text-xs font-normal text-ink-soft">
                ({detalles.length} artículos)
              </span>
            )}
          </h2>
          <div className="bg-paper rounded-xl border border-line overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-soft uppercase tracking-wide">
                  <th className="px-3 py-3 font-medium">Artículo</th>
                  <th className="px-3 py-3 font-medium text-right">Aprtd.</th>
                  <th className="px-3 py-3 font-medium text-right">Devlt.</th>
                  {/* Columna precio solo para jefe */}
                  {puedeEditar && <th className="px-3 py-3 font-medium text-right">Precio</th>}
                  {puedeEditar && !esFinalizado && <th className="px-3 py-3"></th>}
                </tr>
              </thead>
              <tbody>
                {detalles.map(d => (
                  <tr key={d.id_detalle} className="border-b border-line last:border-0 group/row">
                    <td className="px-3 py-2.5 font-medium text-xs leading-tight">
                      {d.nombre_articulo}
                      <span className={`block text-xs font-normal ${
                        d.cantidad_disponible_real < d.cantidad_asignada
                          ? "text-alert" : "text-ink-soft"
                      }`}>
                        {d.cantidad_disponible_real} disp. real
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">{d.cantidad_asignada}</td>
                    <td className="px-3 py-2.5 text-right">
                      {!esFinalizado ? (
                        <button
                          onClick={() => { setModalDevolucion(d); setCantDevuelta(d.cantidad_devuelta || 0); }}
                          className="text-xs hover:underline">
                          {d.cantidad_devuelta > 0
                            ? <Badge tono="bueno">{d.cantidad_devuelta}</Badge>
                            : <span className="text-ink-soft hover:text-gold-deep">0</span>}
                        </button>
                      ) : (
                        d.cantidad_devuelta > 0
                          ? <Badge tono="bueno">{d.cantidad_devuelta}</Badge>
                          : <span className="text-ink-soft">0</span>
                      )}
                    </td>

                    {/* Precio — solo jefe */}
                    {puedeEditar && (
                      <td className="px-3 py-2.5 text-right">
                        {!esFinalizado && editandoPrecio === d.id_detalle ? (
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-xs text-ink-soft">$</span>
                            <input type="number" min="0" step="0.01"
                              value={precioTemp}
                              onChange={e => setPrecioTemp(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") guardarPrecio(d.id_detalle);
                                if (e.key === "Escape") setEditandoPrecio(null);
                              }}
                              className="w-20 text-right text-xs border border-gold rounded py-0.5 px-1"
                              autoFocus />
                            <button onClick={() => guardarPrecio(d.id_detalle)} className="text-gold-deep">
                              <Check size={13} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => !esFinalizado && iniciarEditarPrecio(d)}
                            disabled={esFinalizado}
                            className="flex items-center gap-1 ml-auto text-xs group/precio">
                            <span className={d.precio_override != null ? "text-gold-deep font-medium" : "text-ink-soft"}>
                              {d.precio_override != null
                                ? `$${Number(d.precio_override).toLocaleString("es-MX")}`
                                : d.precio_base
                                  ? `$${Number(d.precio_base).toLocaleString("es-MX")}`
                                  : "—"}
                            </span>
                            {!esFinalizado && (
                              <Pencil size={11} className="opacity-0 group-hover/precio:opacity-60 text-ink-soft" />
                            )}
                          </button>
                        )}
                      </td>
                    )}

                    {/* Eliminar artículo — solo jefe */}
                    {puedeEditar && !esFinalizado && (
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => eliminarDetalle(d.id_detalle)}
                          className="text-ink-soft hover:text-alert opacity-0 group-hover/row:opacity-100 transition-opacity">
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan={puedeEditar ? 5 : 3}
                      className="px-4 py-8 text-center text-ink-soft">
                      {puedeEditar
                        ? "Selecciona artículos del inventario y guarda la selección."
                        : "No hay artículos asignados a este evento todavía."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {puedeEditar && !esFinalizado && detalles.length > 0 && (
            <p className="text-xs text-ink-soft mt-2 px-1">
              <span className="text-gold-deep font-medium">Dorado</span> = precio especial ·
              Gris = precio base · Click para editar
            </p>
          )}
        </div>
      </div>

      {/* Modal devolución */}
      <Modal abierto={!!modalDevolucion} onCerrar={() => setModalDevolucion(null)}
        titulo="Registrar devolución">
        <form onSubmit={guardarDevolucion} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Artículo: <span className="font-medium text-ink">{modalDevolucion?.nombre_articulo}</span>
            <br />Asignados: <strong>{modalDevolucion?.cantidad_asignada}</strong>
          </p>
          <Campo etiqueta="Cantidad devuelta">
            <Input type="number" min="0" max={modalDevolucion?.cantidad_asignada}
              value={cantDevuelta} onChange={e => setCantDevuelta(e.target.value)} required />
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalDevolucion(null)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit">Guardar</Boton>
          </div>
        </form>
      </Modal>

      {/* Modal cotización — solo jefe */}
      <Modal abierto={modalCotizacion} onCerrar={() => setModalCotizacion(false)}
        titulo="Cotización para cliente">
        <form onSubmit={exportarCotizacion} className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            Se usan precios especiales si los hay, o el precio base del inventario.
          </p>
          <Campo etiqueta="Flete ($0 si no aplica)">
            <Input type="number" min="0" step="0.01"
              value={flete} onChange={e => setFlete(e.target.value)} />
          </Campo>
          <div className="flex justify-end gap-2">
            <Boton variante="fantasma" type="button" onClick={() => setModalCotizacion(false)}>Cancelar</Boton>
            <Boton variante="dorado" type="submit">Generar PDF</Boton>
          </div>
        </form>
      </Modal>

      {/* Modal finalizar — solo jefe */}
      <Modal abierto={modalFinalizar} onCerrar={() => !finalizando && setModalFinalizar(false)}
        titulo="Finalizar evento">
        {resultadoFinal ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 bg-good-pale rounded-xl p-4">
              <CheckCircle size={20} className="text-good shrink-0" />
              <div>
                <p className="text-sm font-medium text-good">Evento finalizado correctamente</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {resultadoFinal.total_bajas > 0
                    ? `Se registraron ${resultadoFinal.total_bajas} baja(s) en el inventario.`
                    : "Todo el material fue devuelto."}
                </p>
              </div>
            </div>
            {resultadoFinal.bajas_registradas?.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-ink-soft uppercase tracking-wide">Bajas registradas</p>
                {resultadoFinal.bajas_registradas.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-mist rounded-lg px-3 py-2">
                    <span className="font-medium">{b.articulo}</span>
                    <span className="text-ink-soft text-xs">{b.no_devuelto} pza · {b.motivo}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-end">
              <Boton variante="dorado" onClick={() => setModalFinalizar(false)}>Cerrar</Boton>
            </div>
          </div>
        ) : (
          <form onSubmit={confirmarFinalizar} className="flex flex-col gap-4">
            <p className="text-sm text-ink-soft">
              Registra cuántas piezas regresaron. Lo que no regrese se dará de baja con el motivo que indiques.
            </p>
            <div className="flex flex-col gap-0 rounded-xl border border-line overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-mist text-xs font-medium
                              text-ink-soft uppercase tracking-wide border-b border-line">
                <span className="col-span-4">Artículo</span>
                <span className="col-span-2 text-right">Salió</span>
                <span className="col-span-2 text-right">Regresó</span>
                <span className="col-span-4">Motivo baja</span>
              </div>
              {filasFinalizar.map((fila, idx) => {
                const noDevuelto = fila.cantidad_asignada - Number(fila.cantidad_devuelta || 0);
                return (
                  <div key={fila.id_detalle}
                    className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center
                                border-b border-line last:border-0
                                ${noDevuelto > 0 ? "bg-alert-pale/30" : ""}`}>
                    <span className="col-span-4 text-sm font-medium leading-tight truncate"
                      title={fila.nombre_articulo}>{fila.nombre_articulo}</span>
                    <span className="col-span-2 text-right text-sm">{fila.cantidad_asignada}</span>
                    <div className="col-span-2 flex justify-end">
                      <input type="number" min="0" max={fila.cantidad_asignada}
                        value={fila.cantidad_devuelta}
                        onChange={e => actualizarFila(idx, "cantidad_devuelta", Number(e.target.value))}
                        className="w-16 text-center text-sm border border-line rounded-lg py-1
                                   focus:outline-none focus:ring-2 focus:ring-gold/40" />
                    </div>
                    <div className="col-span-4">
                      {noDevuelto > 0 ? (
                        <Select value={fila.motivo_baja}
                          onChange={e => actualizarFila(idx, "motivo_baja", e.target.value)}>
                          {MOTIVOS_BAJA.map(m => (
                            <option key={m.value} value={m.value}>{m.label}</option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-xs text-good">✓ Completo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {filasFinalizar.some(f => f.cantidad_asignada - Number(f.cantidad_devuelta || 0) > 0) && (
              <div className="bg-alert-pale rounded-lg px-3 py-2 text-xs text-alert">
                Hay artículos que no regresan — se registrarán como bajas.
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Boton variante="fantasma" type="button"
                onClick={() => setModalFinalizar(false)} disabled={finalizando}>Cancelar</Boton>
              <Boton variante="dorado" type="submit" disabled={finalizando}>
                {finalizando ? "Finalizando..." : "Confirmar y finalizar"}
              </Boton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}