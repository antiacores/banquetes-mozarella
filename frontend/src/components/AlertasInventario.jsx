export default function AlertasInventario({ bajoStock, alertasDisponibilidad }) {
  const totalAlertas = (bajoStock?.length || 0) + (alertasDisponibilidad?.length || 0);

  if (totalAlertas === 0) {
    return (
      <div className="bg-paper rounded-xl border border-line p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-good" />
          <h2 className="font-display text-base font-semibold">Alertas de inventario</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Todo en orden. No hay artículos con stock bajo ni faltantes para eventos próximos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl border border-line p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-alert" />
        <h2 className="font-display text-base font-semibold">Alertas de inventario</h2>
      </div>

      {alertasDisponibilidad && alertasDisponibilidad.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft mb-2">
            Faltantes para eventos próximos
          </p>
          <div className="flex flex-col gap-2">
            {alertasDisponibilidad.map((a, i) => (
              <div key={i} className="bg-alert-pale rounded-lg px-3 py-2.5 text-sm">
                <span className="font-medium">{a.articulo}</span>
                <span className="text-ink-soft"> — faltan </span>
                <span className="font-medium text-alert">{a.faltante}</span>
                <span className="text-ink-soft">
                  {" "}para el evento del{" "}
                  {new Date(a.fecha + "T00:00:00").toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  ({a.nombre_cliente || "sin cliente"})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bajoStock && bajoStock.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft mb-2">
            Requieren reposición
          </p>
          <div className="flex flex-col gap-2">
            {bajoStock.map((a, i) => (
              <div key={i} className="bg-gold-pale rounded-lg px-3 py-2.5 text-sm flex justify-between items-center">
                <span className="font-medium">{a.nombre}</span>
                <span className="text-ink-soft text-xs">
                  {a.cantidad_disponible} disponibles · mínimo {a.cantidad_minima}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
