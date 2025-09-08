import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
          <Routes>
            {/* Public customer menu - no auth required */}
            <Route path="/" element={<CustomerMenu />} />
            <Route path="/auth" element={<Auth />} />
            
            {/* Staff dashboard with nested routes */}
            <Route path="/dashboard" element={<StaffDashboard />}>
              <Route path="menu" element={<MenuManagement />} />
              <Route path="inventory" element={<InventoryManagement />} />
              <Route path="sales" element={<SalesHistory />} />
              <Route path="reports" element={<Reports />} />
              <Route path="staff" element={<StaffManagement />} />
            </Route>
            
            {/* Individual pages for direct access */}
            <Route path="/order-management" element={<OrderManagement />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/staff" element={<StaffManagement />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
