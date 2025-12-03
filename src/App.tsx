// Importar el nuevo componente
import Users from "./pages/admin/Users";

// Agregar nueva ruta en Routes
<Route 
  path="/admin/users" 
  element={
    <AuthGuard allowedRoles={['admin']}>
      <Users />
    </AuthGuard>
  } 
/>