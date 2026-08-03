import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import LOGO_B64 from "../assets/logo.js";

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [correo, setCorreo]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const perfil = await login(correo, password);
      // Jefe → Dashboard, Almacén → Artículos
      navigate(perfil === "jefe" ? "/" : "/articulos");
    } catch (err) {
      setError(
        err?.response?.data?.detail || "No se pudo iniciar sesión. Verifica tus datos."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-mist flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={LOGO_B64} alt="Eventos Mozzarella" className="h-16 w-auto" />
        </div>

        {/* Tarjeta */}
        <div className="bg-paper rounded-2xl border border-line p-8">
          <h1 className="font-display text-xl font-semibold mb-1">Bienvenido</h1>
          <p className="text-sm text-ink-soft mb-6">Inicia sesión para continuar</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">Correo</label>
              <input
                type="email"
                required
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="w-full px-3 py-2.5 rounded-lg border border-line bg-paper text-sm
                           focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-soft">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-line bg-paper text-sm
                           focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold"
              />
            </div>

            {error && (
              <p className="text-sm text-alert bg-alert-pale rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium
                         hover:bg-ink/90 transition-colors disabled:opacity-50 mt-2"
            >
              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <p className="text-xs text-ink-soft text-center mt-4">
          Eventos Mozzarella © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}