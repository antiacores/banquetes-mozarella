const ESTADO_ESTILOS = {
  confirmado: "bg-good-pale text-good",
  pendiente: "bg-gold-pale text-gold-deep",
  cotizacion: "bg-mist text-ink-soft",
  finalizado: "bg-mist text-ink-soft",
  cancelado: "bg-alert-pale text-alert",
};

function formatearFecha(fechaStr) {
  const fecha = new Date(fechaStr + "T00:00:00");
  return {
    dia: fecha.toLocaleDateString("es-MX", { day: "numeric" }),
    mes: fecha.toLocaleDateString("es-MX", { month: "short" }).replace(".", ""),
  };
}

export default function ProximosEventos({ eventos }) {
  if (!eventos || eventos.length === 0) {
    return (
      <div className="bg-paper rounded-xl border border-line p-6">
        <h2 className="font-display text-base font-semibold mb-3">Próximos eventos</h2>
        <p className="text-sm text-ink-soft">No hay eventos programados todavía.</p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl border border-line p-6">
      <h2 className="font-display text-base font-semibold mb-4">Próximos eventos</h2>
      <div className="flex flex-col gap-1">
        {eventos.map((evento) => {
          const { dia, mes } = formatearFecha(evento.fecha);
          return (
            <div
              key={evento.id_evento}
              className="flex items-center justify-between gap-3 py-3 border-b border-line last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-mist shrink-0">
                  <span className="text-[10px] uppercase text-ink-soft leading-none font-medium">
                    {mes}
                  </span>
                  <span className="font-display text-sm font-semibold leading-tight">
                    {dia}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {evento.nombre_cliente || "Sin nombre de cliente"}
                  </p>
                  <p className="text-xs text-ink-soft truncate">
                    {evento.tipo} · {evento.lugar || "Sin lugar"} · {evento.num_invitados ?? "?"} invitados
                  </p>
                </div>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${ESTADO_ESTILOS[evento.estado] || ESTADO_ESTILOS.cotizacion}`}
              >
                {evento.estado}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
