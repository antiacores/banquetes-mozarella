import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Menu, X, LayoutDashboard, Package, CalendarDays,
  PackageMinus, ShoppingBag, LogOut, User, Users, KeyRound
} from "lucide-react";
import { useAuth, esJefe } from "../../lib/AuthContext";
import { api } from "../../lib/api";
import { Modal, Campo, Input, Boton } from "../ui";
import LOGO_B64 from "../../assets/logo.js";

const ITEMS_JEFE = [
  { to: "/",           label: "Dashboard", icono: LayoutDashboard },
  { to: "/articulos",  label: "Artículos", icono: Package },
  { to: "/eventos",    label: "Eventos",   icono: CalendarDays },
  { to: "/rentas",     label: "Rentas",    icono: ShoppingBag },
  { to: "/clientes",   label: "Clientes",  icono: Users },
  { to: "/bajas",      label: "Bajas",     icono: PackageMinus },
];

const ITEMS_ALMACEN = [
  { to: "/articulos",  label: "Artículos", icono: Package },
  { to: "/eventos",    label: "Eventos",   icono: CalendarDays },
  { to: "/bajas",      label: "Bajas",     icono: PackageMinus },
];

function NavItems({ items, onClick }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(({ to, label, icono: Icono }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          onClick={onClick}
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
  );
}

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto]       = useState(false);
  const [modalPassword, setModalPassword]   = useState(false);
  const [formPass, setFormPass]             = useState({ actual: "", nueva: "", confirmar: "" });
  const [errorPass, setErrorPass]           = useState("");
  const [guardandoPass, setGuardandoPass]   = useState(false);
  const [exitoPass, setExitoPass]           = useState(false);

  const items = esJefe(usuario) ? ITEMS_JEFE : ITEMS_ALMACEN;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function abrirModalPassword() {
    setFormPass({ actual: "", nueva: "", confirmar: "" });
    setErrorPass("");
    setExitoPass(false);
    setModalPassword(true);
  }

  async function cambiarPassword(e) {
    e.preventDefault();
    setErrorPass("");
    if (formPass.nueva.length < 6) {
      setErrorPass("La contraseña nueva debe tener al menos 6 caracteres.");
      return;
    }
    if (formPass.nueva !== formPass.confirmar) {
      setErrorPass("Las contraseñas nuevas no coinciden.");
      return;
    }
    setGuardandoPass(true);
    try {
      await api.post("/auth/cambiar-password", {
        password_actual: formPass.actual,
        password_nuevo:  formPass.nueva,
      });
      setExitoPass(true);
    } catch (err) {
      setErrorPass(err?.response?.data?.detail || "Error al cambiar la contraseña.");
    } finally {
      setGuardandoPass(false);
    }
  }

  function SidebarContent({ onNav }) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 pt-6 pb-4">
          <img src={LOGO_B64} alt="Eventos Mozzarella" className="w-full max-w-[130px] mb-6" />
          <NavItems items={items} onClick={onNav} />
        </div>
        <div className="mt-auto px-4 pb-6 border-t border-line pt-4">
          {/* Perfil — click abre modal de contraseña */}
          <button
            onClick={abrirModalPassword}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg w-full
                       hover:bg-mist transition-colors group mb-1">
            <div className="w-7 h-7 rounded-full bg-mist group-hover:bg-paper flex items-center
                            justify-center shrink-0 transition-colors">
              <User size={14} className="text-ink-soft" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-xs font-medium truncate">{usuario?.nombre}</p>
              <p className="text-xs text-ink-soft capitalize">{usuario?.perfil}</p>
            </div>
            <KeyRound size={13} className="text-ink-soft opacity-0 group-hover:opacity-60
                                           transition-opacity ml-auto shrink-0" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-soft
                       hover:bg-alert-pale hover:text-alert w-full transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-paper hidden md:flex flex-col
                        fixed top-0 left-0 h-screen overflow-y-auto z-30">
        <SidebarContent />
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-paper border-b border-line
                      px-4 py-3 flex items-center justify-between">
        <img src={LOGO_B64} alt="Eventos Mozzarella" className="h-8 w-auto" />
        <button onClick={() => setMenuAbierto(true)}><Menu size={22} /></button>
      </div>

      {menuAbierto && (
        <div className="md:hidden fixed inset-0 z-50 bg-ink/40"
          onClick={() => setMenuAbierto(false)}>
          <div className="bg-paper w-64 h-full flex flex-col"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-4 border-b border-line">
              <img src={LOGO_B64} alt="Eventos Mozzarella" className="h-8 w-auto" />
              <button onClick={() => setMenuAbierto(false)}><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent onNav={() => setMenuAbierto(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        <Outlet />
      </main>

      {/* Modal cambiar contraseña */}
      <Modal abierto={modalPassword} onCerrar={() => setModalPassword(false)}
        titulo="Cambiar contraseña">
        {exitoPass ? (
          <div className="flex flex-col gap-4">
            <div className="bg-good-pale rounded-lg px-4 py-3 text-sm text-good font-medium">
              ✓ Contraseña actualizada correctamente.
            </div>
            <div className="flex justify-end">
              <Boton variante="dorado" onClick={() => setModalPassword(false)}>Cerrar</Boton>
            </div>
          </div>
        ) : (
          <form onSubmit={cambiarPassword} className="flex flex-col gap-4">
            <Campo etiqueta="Contraseña actual">
              <Input type="password" required value={formPass.actual}
                onChange={e => setFormPass({ ...formPass, actual: e.target.value })} />
            </Campo>
            <Campo etiqueta="Contraseña nueva">
              <Input type="password" required value={formPass.nueva}
                onChange={e => setFormPass({ ...formPass, nueva: e.target.value })}
                placeholder="Mínimo 6 caracteres" />
            </Campo>
            <Campo etiqueta="Confirmar contraseña nueva">
              <Input type="password" required value={formPass.confirmar}
                onChange={e => setFormPass({ ...formPass, confirmar: e.target.value })} />
            </Campo>
            {errorPass && (
              <p className="text-sm text-alert bg-alert-pale rounded-lg px-3 py-2">{errorPass}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Boton variante="fantasma" type="button"
                onClick={() => setModalPassword(false)}>Cancelar</Boton>
              <Boton variante="dorado" type="submit" disabled={guardandoPass}>
                {guardandoPass ? "Guardando..." : "Cambiar contraseña"}
              </Boton>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}