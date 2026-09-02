import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth, esJefe } from "./lib/AuthContext";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Articulos from "./pages/Articulos";
import Eventos from "./pages/Eventos";
import DetalleEvento from "./pages/DetalleEvento";
import Rentas from "./pages/Rentas";
import Clientes from "./pages/Clientes";
import Bajas from "./pages/Bajas";

function RutaProtegida({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

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
      <Route path="/login" element={<Login />} />
      <Route element={<RutaProtegida><Layout /></RutaProtegida>}>
        {/* Solo jefe */}
        <Route path="/" element={<SoloJefe><Dashboard /></SoloJefe>} />
        <Route path="/rentas" element={<SoloJefe><Rentas /></SoloJefe>} />
        <Route path="/clientes" element={<SoloJefe><Clientes /></SoloJefe>} />
        {/* Ambos perfiles */}
        <Route path="/articulos" element={<Articulos />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/eventos/:id" element={<DetalleEvento />} />
        <Route path="/bajas" element={<Bajas />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}