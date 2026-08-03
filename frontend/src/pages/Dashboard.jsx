import { useEffect, useState } from "react";
import { CalendarDays, AlertTriangle, TrendingUp, ShoppingBag } from "lucide-react";
import { obtenerResumenDashboard, obtenerProximosEventos } from "../lib/api";
import { api } from "../lib/api";
import TarjetaKPI from "../components/TarjetaKPI";
import ProximosEventos from "../components/ProximosEventos";
import DisponibilidadCategoria from "../components/DisponibilidadCategoria";
import AlertasInventario from "../components/AlertasInventario";

function fechaHoy() {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [resumen, setResumen] = useState(null);
  const [eventos, setEventos] = useState([]);
  const [totalRentas, setTotalRentas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [resumenData, eventosData, rentasData] = await Promise.all([
          obtenerResumenDashboard(),
          obtenerProximosEventos(5),
          api.get("/rentas/").then(r => r.data),
        ]);
        setResumen(resumenData);
        setEventos(eventosData);

        const ahora = new Date();
        const rentasMes = rentasData.filter(r => {
          const fecha = new Date(r.fecha_entrega);
          return fecha.getMonth() === ahora.getMonth() &&
                 fecha.getFullYear() === ahora.getFullYear();
        });
        setTotalRentas(rentasMes.length);
      } catch {
        setError("No se pudo conectar con el servidor.");
      } finally {
        setCargando(false);
      }
    }
    cargarDatos();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-soft">Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-paper border border-line rounded-xl p-6 max-w-md text-center">
          <p className="text-alert font-medium mb-1">No se pudo cargar el dashboard</p>
          <p className="text-sm text-ink-soft">{error}</p>
        </div>
      </div>
    );
  }

  const top10 = resumen?.top10_articulos || [];

  return (
    <div className="min-h-screen px-6 py-8 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          {/* Fecha del día */}
          <p className="text-xs text-ink-soft mb-1 capitalize">{fechaHoy()}</p>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <TarjetaKPI
          etiqueta="Rentas este mes"
          valor={totalRentas ?? 0}
          icono={<ShoppingBag size={16} />}
        />
        <TarjetaKPI
          etiqueta="Eventos este mes"
          valor={resumen?.eventos_este_mes ?? 0}
          icono={<CalendarDays size={16} />}
        />
        <TarjetaKPI
          etiqueta="Artículos con bajo stock"
          valor={resumen?.articulos_bajo_stock?.length ?? 0}
          detalle="requieren reposición"
          destacado={resumen?.articulos_bajo_stock?.length > 0}
          icono={<AlertTriangle size={16} />}
        />
        <TarjetaKPI
          etiqueta="Artículo más usado"
          valor={top10[0]?.nombre || "—"}
          detalle={top10[0] ? `${top10[0].total_asignaciones} asignaciones` : null}
          icono={<TrendingUp size={16} />}
        />
      </div>

      {/* Próximos eventos + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <ProximosEventos eventos={eventos} />
        <AlertasInventario
          bajoStock={resumen?.articulos_bajo_stock}
          alertasDisponibilidad={resumen?.alertas_disponibilidad}
        />
      </div>

      <DisponibilidadCategoria categorias={resumen?.disponibilidad_por_categoria} />
    </div>
  );
}