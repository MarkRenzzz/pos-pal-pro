import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthRedirect from "./components/AuthRedirect";
import CustomerMenu from "./pages/CustomerMenu";
import StaffDashboard from "./pages/StaffDashboard";
import Auth from "./pages/Auth";
import MenuManagement from "./pages/MenuManagement";
import InventoryManagement from "./pages/InventoryManagement";
import SalesHistory from "./pages/SalesHistory";
import Reports from "./pages/Reports";
import StaffManagement from "./pages/StaffManagement";
import OrderManagement from "./pages/OrderManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthRedirect />
          <Routes>
            {/* Public customer menu - no auth required */}
            <Route path="/" element={<CustomerMenu />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Protected staff routes */}
            <Route path="/dashboard" element={<ProtectedRoute><StaffDashboard /></ProtectedRoute>} />
            <Route path="/order-management" element={<ProtectedRoute><OrderManagement /></ProtectedRoute>} />
            <Route path="/menu" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><InventoryManagement /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><SalesHistory /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute><StaffManagement /></ProtectedRoute>} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
