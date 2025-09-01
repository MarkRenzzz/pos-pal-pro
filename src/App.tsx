import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import POSSystem from "./pages/POSSystem";
import MenuManagement from "./pages/MenuManagement";
import InventoryManagement from "./pages/InventoryManagement";
import SalesHistory from "./pages/SalesHistory";
import Reports from "./pages/Reports";
import StaffManagement from "./pages/StaffManagement";
import NotFound from "./pages/NotFound";

// Create QueryClient with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  // Ensure queryClient exists before rendering
  if (!queryClient) {
    return <div>Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/pos" element={<POSSystem />} />
              <Route path="/menu" element={<MenuManagement />} />
              <Route path="/inventory" element={<InventoryManagement />} />
              <Route path="/sales" element={<SalesHistory />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/staff" element={<StaffManagement />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
