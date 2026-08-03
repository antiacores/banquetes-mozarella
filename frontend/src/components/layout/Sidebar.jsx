import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  CalendarDays,
  PackageMinus,
  Truck,
  Repeat,
  ShoppingBag,
} from "lucide-react";
import LOGO_B64 from "../../assets/logo.js";

const ITEMS = [
  { to: "/",            label: "Dashboard",   icono: LayoutDashboard },
  { to: "/articulos",   label: "Artículos",   icono: Package },
  { to: "/eventos",     label: "Eventos",     icono: CalendarDays },
  { to: "/rentas",      label: "Rentas",      icono: ShoppingBag },
  { to: "/bajas",       label: "Bajas",       icono: PackageMinus },
  { to: "/proveedores", label: "Proveedores", icono: Truck },
  { to: "/reposiciones",label: "Reposiciones",icono: Repeat },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-paper min-h-screen px-4 py-6 hidden md:flex flex-col">
      {/* Logo real de Mozzarella */}
      <div className="px-2 mb-8">
        <img src={LOGO_B64} alt="Eventos Mozzarella" className="w-full max-w-[140px]" />
      </div>

      <nav className="flex flex-col gap-1">
        {ITEMS.map(({ to, label, icono: Icono }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-gold-pale text-gold-deep"
                  : "text-ink-soft hover:bg-mist hover:text-ink"
              }`
            }
          >
            <Icono size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}