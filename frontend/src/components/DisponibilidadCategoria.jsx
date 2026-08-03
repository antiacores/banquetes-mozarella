export default function DisponibilidadCategoria({ categorias }) {
  if (!categorias || categorias.length === 0) {
    return (
      <div className="bg-paper rounded-xl border border-line p-6">
        <h2 className="font-display text-base font-semibold mb-3">Disponibilidad por categoría</h2>
        <p className="text-sm text-ink-soft">Sin datos de inventario todavía.</p>
      </div>
    );
  }

  return (
    <div className="bg-paper rounded-xl border border-line p-6">
      <h2 className="font-display text-base font-semibold mb-5">Disponibilidad por categoría</h2>
      <div className="flex flex-col gap-4">
        {categorias.map((cat) => {
          const porcentaje = Math.min(100, Math.max(0, cat.porcentaje_disponible ?? 0));
          const critico = porcentaje < 30;
          return (
            <div key={cat.id_categoria}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{cat.categoria}</span>
                <span className={`text-sm font-medium ${critico ? "text-alert" : "text-ink-soft"}`}>
                  {porcentaje}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-mist overflow-hidden">
                <div
                  className={`h-full rounded-full ${critico ? "bg-alert" : "bg-gold"}`}
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
