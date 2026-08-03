export function Boton({ children, variante = "primario", className = "", ...props }) {
  const estilos = {
    primario: "bg-ink text-white hover:bg-ink/90",
    dorado: "bg-gold text-white hover:bg-gold-deep",
    fantasma: "bg-transparent text-ink-soft hover:bg-mist border border-line",
    peligro: "bg-transparent text-alert hover:bg-alert-pale border border-alert/30",
  };
  return (
    <button
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${estilos[variante]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Campo({ etiqueta, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-soft">{etiqueta}</span>
      {children}
    </label>
  );
}

const inputBase =
  "w-full px-3 py-2 rounded-lg border border-line bg-paper text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold";

export function Input(props) {
  return <input className={inputBase} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={inputBase} {...props}>
      {children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea className={`${inputBase} resize-none`} rows={3} {...props} />;
}

export function Modal({ abierto, onCerrar, titulo, children }) {
  if (!abierto) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-paper rounded-xl border border-line w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-line flex items-center justify-between sticky top-0 bg-paper">
          <h2 className="font-display text-base font-semibold">{titulo}</h2>
          <button onClick={onCerrar} className="text-ink-soft hover:text-ink text-xl leading-none">
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export function Badge({ children, tono = "neutro" }) {
  const tonos = {
    neutro: "bg-mist text-ink-soft",
    bueno: "bg-good-pale text-good",
    alerta: "bg-alert-pale text-alert",
    dorado: "bg-gold-pale text-gold-deep",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${tonos[tono]}`}>
      {children}
    </span>
  );
}
