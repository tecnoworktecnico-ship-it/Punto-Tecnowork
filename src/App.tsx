import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SessionContextProvider } from "@/contexts/SessionContext";
import AuthGuard from "@/components/AuthGuard";

// Pages
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";
import EmailVerificationError from "@/pages/EmailVerificationError";
import AuthCallback from "@/pages/AuthCallback";
import ResetPassword from "@/pages/ResetPassword";
import DebugRecovery from "@/pages/DebugRecovery";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import BrandingSettings from "@/pages/admin/BrandingSettings";
import GlobalPrices from "@/pages/admin/GlobalPrices";
import Locals from "@/pages/admin/Locals";
import Users from "@/pages/admin/Users";
import AdminReports from "@/pages/admin/AdminReports";
import Rewards from "@/pages/admin/Rewards";
import AdminOrders from "@/pages/admin/Orders"; 
import MaintenancePage from "@/pages/admin/Maintenance"; // Importar nueva página

// Local Pages
import LocalDashboard from "@/pages/local/Dashboard";
import LocalPrices from "@/pages/local/LocalPrices";
import LocalOrders from "@/pages/local/Orders";
import LocalOrderDetail from "@/pages/local/OrderDetail";
import LocalReports from "@/pages/local/LocalReports";
import LocalRewards from "@/pages/local/LocalRewards";

// Client Pages
import ClientDashboard from "@/pages/client/Dashboard";
import NewOrder from "@/pages/client/NewOrder";
import ClientOrders from "@/pages/client/Orders";
import ClientRewards from "@/pages/client/Rewards";
import ClientPoints from "@/pages/client/Points";
import ClientProfile from "@/pages/client/Profile"; // Importar nueva página

function App() {
  return (
    <BrowserRouter>
      <SessionContextProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verification-error" element={<EmailVerificationError />} />
          <Route path="/auth-callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/debug-recovery" element={<DebugRecovery />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <AdminDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <AdminReports />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/branding"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <BrandingSettings />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/global-prices"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <GlobalPrices />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/locals"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <Locals />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <Users />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/rewards"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <Rewards />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <AdminOrders />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/maintenance"
            element={
              <AuthGuard allowedRoles={["admin"]}>
                <MaintenancePage />
              </AuthGuard>
            }
          />

          {/* Local Routes */}
          <Route
            path="/local/dashboard"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/local/reports"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalReports />
              </AuthGuard>
            }
          />
          <Route
            path="/local/prices"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalPrices />
              </AuthGuard>
            }
          />
          <Route
            path="/local/orders"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalOrders />
              </AuthGuard>
            }
          />
          <Route
            path="/local/orders/:orderId"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalOrderDetail />
              </AuthGuard>
            }
          />
          <Route
            path="/local/rewards"
            element={
              <AuthGuard allowedRoles={["local"]}>
                <LocalRewards />
              </AuthGuard>
            }
          />

          {/* Client Routes */}
          <Route
            path="/client"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <ClientDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/client/new-order"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <NewOrder />
              </AuthGuard>
            }
          />
          <Route
            path="/client/orders"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <ClientOrders />
              </AuthGuard>
            }
          />
          <Route
            path="/client/rewards"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <ClientRewards />
              </AuthGuard>
            }
          />
          <Route
            path="/client/points"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <ClientPoints />
              </AuthGuard>
            }
          />
          <Route
            path="/client/profile"
            element={
              <AuthGuard allowedRoles={["client"]}>
                <ClientProfile />
              </AuthGuard>
            }
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </SessionContextProvider>
    </BrowserRouter>
  );
}

export default App;