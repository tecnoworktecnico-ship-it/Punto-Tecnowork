import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SessionContextProvider } from "@/contexts/SessionContext";
import AuthGuard from "@/components/AuthGuard";

// Pages
import LandingPage from "@/pages/LandingPage";
import Login from "@/pages/Login";
import NotFound from "@/pages/NotFound";

// Admin Pages
import AdminDashboard from "@/pages/admin/Dashboard";
import BrandingSettings from "@/pages/admin/BrandingSettings";
import GlobalPrices from "@/pages/admin/GlobalPrices";
import Locals from "@/pages/admin/Locals";
import Users from "@/pages/admin/Users";

// Local Pages
import LocalDashboard from "@/pages/local/Dashboard";
import LocalPrices from "@/pages/local/LocalPrices";
import LocalOrders from "@/pages/local/Orders";

// Client Pages
import ClientDashboard from "@/pages/client/Dashboard";
import NewOrder from "@/pages/client/NewOrder";
import ClientOrders from "@/pages/client/Orders";
import ClientRewards from "@/pages/client/Rewards";
import ClientPoints from "@/pages/client/Points";

function App() {
  return (
    <BrowserRouter>
      <SessionContextProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

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

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toaster />
      </SessionContextProvider>
    </BrowserRouter>
  );
}

export default App;