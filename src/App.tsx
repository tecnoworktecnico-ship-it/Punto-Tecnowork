import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { SessionContextProvider } from "./contexts/SessionContext";
import AuthGuard from "./components/AuthGuard";
import ClientDashboard from "./pages/client/Dashboard";
import LocalDashboard from "./pages/local/Dashboard";
import AdminDashboard from "./pages/admin/Dashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SessionContextProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} /> {/* Public landing page or redirect */}

            {/* Protected Client Routes */}
            <Route element={<AuthGuard allowedRoles={['client']} />}>
              <Route path="/client" element={<ClientDashboard />} />
              {/* Add other client routes here */}
            </Route>

            {/* Protected Local Routes */}
            <Route element={<AuthGuard allowedRoles={['local']} />}>
              <Route path="/local/dashboard" element={<LocalDashboard />} />
              {/* Add other local routes here */}
            </Route>

            {/* Protected Admin Routes */}
            <Route element={<AuthGuard allowedRoles={['admin']} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              {/* Add other admin routes here */}
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionContextProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;