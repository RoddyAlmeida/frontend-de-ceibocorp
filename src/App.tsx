import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import AlertasStock from './pages/AlertasStock';
import Empleados from './pages/Empleados';
import HistorialVentas from './pages/HistorialVentas';
import Inventario from './pages/Inventario';
import Kardex from './pages/Kardex';
import NuevaVenta from './pages/NuevaVenta';
import Reportes from './pages/Reportes';
import Traslados from './pages/Traslados';
import { useAuthStore } from './store/authStore';
import { getDefaultRouteForRole } from './types/role';

function HomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.role);

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRouteForRole(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute allowedRoles={['bodeguero', 'admin', 'super_admin']} />}>
        <Route element={<Layout />}>
          <Route path="/inventario" element={<Inventario />} />

          <Route element={<ProtectedRoute allowedRoles={['admin', 'super_admin']} />}>
            <Route path="/ventas/nueva" element={<NuevaVenta />} />
            <Route path="/empleados" element={<Empleados />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin', 'bodeguero']} />
            }
          >
            <Route path="/ventas/historial" element={<HistorialVentas />} />
            <Route path="/traslados" element={<Traslados />} />
            <Route path="/kardex" element={<Kardex />} />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={['admin', 'super_admin']} />
            }
          >
            <Route path="/alertas-stock" element={<AlertasStock />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route path="/reportes" element={<Reportes />} />
          </Route>
        </Route>
      </Route>

      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
