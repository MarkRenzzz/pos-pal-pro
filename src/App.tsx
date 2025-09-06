import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import CustomerHomepage from "./pages/CustomerHomepage";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import POSSystem from "./pages/POSSystem";
import MenuManagement from "./pages/MenuManagement";
import InventoryManagement from "./pages/InventoryManagement";
import SalesHistory from "./pages/SalesHistory";
import Reports from "./pages/Reports";
import StaffManagement from "./pages/StaffManagement";
import OrderManagement from "./pages/OrderManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<CustomerHomepage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pos" element={<POSSystem />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/inventory" element={<InventoryManagement />} />
            <Route path="/sales" element={<SalesHistory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/staff" element={<StaffManagement />} />
            <Route path="/order-management" element={<OrderManagement />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
