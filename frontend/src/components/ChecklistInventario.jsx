import { useState, useEffect } from "react";
import { Search, ChevronDown } from "lucide-react";
import { coincideFlexible } from "../lib/busqueda";
import { api } from "../lib/api";

/**
 * Checklist optimizado: carga artículos por categoría solo cuando
 * el usuario la selecciona, en vez de traer los 567 de un jalón.
 */
export default function ChecklistInventario({ categorias, checklist, onChange }) {
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(
    categorias[0]?.id_categoria ?? ""
  );
  const [busqueda, setBusqueda]         = useState("");
  const [articulos, setArticulos]       = useState([]);
  const [cargandoCat, setCargandoCat]   = useState(false);

  // Cargar artículos cuando cambia la categoría seleccionada
  useEffect(() => {
    if (!categoriaSeleccionada) return;
    setCargandoCat(true);
    api.get("/articulos/", {
      params: { id_categoria: categoriaSeleccionada, estado: "activo" }
    })
      .then(r => setArticulos(r.data))
      .catch(() => setArticulos([]))
      .finally(() => setCargandoCat(false));
  }, [categoriaSeleccionada]);

  const artsFiltrados = busqueda
    ? articulos.filter(a => coincideFlexible(a.nombre, busqueda))
    : articulos;

  function setCantidad(idArticulo, valor) {
    onChange(idArticulo, Math.max(0, parseInt(valor) || 0));
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Selector de categoría */}
      <div className="relative">
        <select
          value={categoriaSeleccionada}
          onChange={e => {
            setCategoriaSeleccionada(e.target.value);
            setBusqueda("");
          }}
          className="w-full appearance-none px-4 py-2.5 pr-8 rounded-lg border border-line
                     bg-paper text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gold/40"
        >
          <option value="">Selecciona una categoría</option>
          {categorias.map(c => (
            <option key={c.id_categoria} value={c.id_categoria}>
              {c.nombre}
            </option>
          ))}
        </select>
        <ChevronDown size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
      </div>

      {/* Búsqueda */}
      {categoriaSeleccionada && (
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar en esta categoría..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-line bg-paper text-sm
                       focus:outline-none focus:ring-2 focus:ring-gold/40"
          />
        </div>
      )}

      {/* Lista */}
      <div className="flex flex-col gap-0 rounded-xl border border-line overflow-hidden
                      max-h-[55vh] overflow-y-auto">
        {!categoriaSeleccionada ? (
          <p className="text-sm text-ink-soft text-center py-8">
            Selecciona una categoría para ver los artículos.
          </p>
        ) : cargandoCat ? (
          <p className="text-sm text-ink-soft text-center py-8">Cargando artículos...</p>
        ) : artsFiltrados.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-6">No se encontraron artículos.</p>
        ) : (
          artsFiltrados.map(a => {
            const cantidad    = checklist[a.id_articulo] || 0;
            const dispReal    = a.cantidad_disponible_real ?? a.cantidad_disponible;
            const sinStock    = dispReal <= 0;

            return (
              <div key={a.id_articulo}
                className={`flex items-center justify-between gap-3 px-4 py-3
                            border-b border-line last:border-0
                            ${cantidad > 0 ? "bg-gold-pale/30" : ""}
                            ${sinStock ? "opacity-60" : ""}`}>

                <div className="flex items-center gap-2.5 min-w-0">
                  {a.imagen_url && (
                    <img src={a.imagen_url} alt={a.nombre}
                      className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.nombre}</p>
                    <p className={`text-xs ${sinStock ? "text-alert" : "text-ink-soft"}`}>
                      {dispReal} disponibles
                      {cantidad > 0 && (
                        <span className="text-gold-deep font-medium"> · {cantidad} seleccionados</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setCantidad(a.id_articulo, cantidad - 1)}
                    disabled={cantidad === 0}
                    className="w-7 h-7 rounded-lg border border-line hover:bg-mist
                               flex items-center justify-center text-base leading-none disabled:opacity-40">
                    −
                  </button>
                  <input
                    type="number" min="0"
                    value={cantidad}
                    onChange={e => setCantidad(a.id_articulo, e.target.value)}
                    className="w-12 text-center text-sm border border-line rounded-lg py-1
                               focus:outline-none focus:ring-2 focus:ring-gold/40"
                  />
                  <button
                    onClick={() => setCantidad(a.id_articulo, cantidad + 1)}
                    className="w-7 h-7 rounded-lg border border-line hover:bg-mist
                               flex items-center justify-center text-base leading-none">
                    +
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Resumen total seleccionados */}
      {Object.values(checklist).some(v => v > 0) && (
        <p className="text-xs text-ink-soft text-center">
          {Object.values(checklist).filter(v => v > 0).length} artículos seleccionados en total
        </p>
      )}
    </div>
  );
}