export default function TarjetaKPI({ etiqueta, valor, detalle, icono, destacado = false }) {
  return (
    <div className="bg-paper rounded-xl border border-line p-5 relative overflow-hidden">
      {destacado && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gold" />
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">
          {etiqueta}
        </span>
        <span className="text-gold">{icono}</span>
      </div>
      <span className="font-display text-3xl font-semibold tracking-tight">{valor}</span>
      {detalle && <p className="text-xs text-ink-soft mt-1">{detalle}</p>}
    </div>
  );
}
