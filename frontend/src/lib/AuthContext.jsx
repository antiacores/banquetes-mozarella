import { createContext, useContext, useState, useEffect } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);   // { nombre, correo, perfil }
  const [cargando, setCargando] = useState(true); // verificando token al inicio

  // Al cargar la app, revisar si hay token guardado
  useEffect(() => {
    const token  = localStorage.getItem("token");
    const perfil = localStorage.getItem("perfil");
    const nombre = localStorage.getItem("nombre");

    if (token && perfil && nombre) {
      // Configurar el token en axios para todas las peticiones
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      setUsuario({ perfil, nombre });
    }
    setCargando(false);
  }, []);

  async function login(correo, password) {
    // OAuth2PasswordRequestForm requiere FormData con username/password
    const form = new URLSearchParams();
    form.append("username", correo);
    form.append("password", password);

    const { data } = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    // Guardar token y datos del usuario
    localStorage.setItem("token",  data.access_token);
    localStorage.setItem("perfil", data.perfil);
    localStorage.setItem("nombre", data.nombre);

    api.defaults.headers.common["Authorization"] = `Bearer ${data.access_token}`;
    setUsuario({ perfil: data.perfil, nombre: data.nombre });

    return data.perfil; // devuelve perfil para redirigir
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("perfil");
    localStorage.removeItem("nombre");
    delete api.defaults.headers.common["Authorization"];
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Verdadero si el usuario tiene perfil de jefe/administrador */
export function esJefe(usuario) {
  return usuario?.perfil === "jefe";
}