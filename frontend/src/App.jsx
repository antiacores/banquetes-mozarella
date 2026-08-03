import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, esJefe } from "./lib/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Articulos from "./pages/Articulos";
import Eventos from "./pages/Eventos";
import DetalleEvento from "./pages/DetalleEvento";
import Rentas from "./pages/Rentas";
import Bajas from "./pages/Bajas";
import Proveedores from "./pages/Proveedores";
import Reposiciones from "./pages/Reposiciones";

/** Ruta que requiere login. Si no hay sesión → /login */
function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null; // espera a verificar el token
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

/** Ruta que requiere perfil de jefe. Si es almacén → /articulos */
function SoloJefe({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  if (!esJefe(usuario)) return <Navigate to="/articulos" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />

      {/* Protegidas */}
      <Route element={
        <RutaProtegida>
          <Layout />
        </RutaProtegida>
      }>
        {/* Solo jefe */}
        <Route path="/" element={<SoloJefe><Dashboard /></SoloJefe>} />
        <Route path="/rentas" element={<SoloJefe><Rentas /></SoloJefe>} />
        <Route path="/proveedores" element={<SoloJefe><Proveedores /></SoloJefe>} />
        <Route path="/reposiciones" element={<SoloJefe><Reposiciones /></SoloJefe>} />

        {/* Ambos perfiles */}
        <Route path="/articulos" element={<Articulos />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/eventos/:id" element={<DetalleEvento />} />
        <Route path="/bajas" element={<Bajas />} />
      </Route>

      {/* Cualquier ruta desconocida → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;