import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Landing } from "./pages/Landing";
import { OrganizationDashboard } from "./pages/OrganizationDashboard";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Check if we're on a subdomain
  const hostname = window.location.hostname;
  const isSubdomain = hostname !== 'yuzen.ainrion.com' && 
                     hostname !== 'localhost' && 
                     !hostname.startsWith('127.0.0.1') &&
                     hostname !== '404fa0df-8c2c-4dde-836f-92b4e9bde035.lovable.app';
  
  if (isSubdomain) {
    // Extract subdomain slug
    const slug = hostname.split('.')[0];
    
    return (
      <Routes>
        <Route path="/" element={
          user ? <OrganizationDashboard /> : <Navigate to="/auth" replace />
        } />
        <Route path="/auth" element={
          user ? <Navigate to="/" replace /> : <Auth />
        } />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={
        user ? <Navigate to="/" replace /> : <Auth />
      } />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-gradient-surface">
            <AppRoutes />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;