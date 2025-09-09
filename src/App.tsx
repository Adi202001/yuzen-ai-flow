import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Landing } from "./pages/Landing";
import { OrganizationDashboard } from "./pages/OrganizationDashboard";
import { Onboarding } from "./pages/Onboarding";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const [hasOrganizations, setHasOrganizations] = useState<boolean | null>(null);

  useEffect(() => {
    const checkUserOrganizations = async () => {
      if (!user) {
        setHasOrganizations(null);
        return;
      }

      try {
        // Check if user owns any organizations
        const { data: ownedOrgs, error: ownedError } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .limit(1);

        if (ownedError) throw ownedError;

        // Check if user is a member of any organizations
        const { data: memberOrgs, error: memberError } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (memberError) throw memberError;

        const hasAnyOrgs = (ownedOrgs && ownedOrgs.length > 0) || (memberOrgs && memberOrgs.length > 0);
        setHasOrganizations(hasAnyOrgs);
      } catch (error) {
        console.error('Error checking user organizations:', error);
        setHasOrganizations(false);
      }
    };

    checkUserOrganizations();
  }, [user]);

  if (loading || (user && hasOrganizations === null)) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={
        user ? (
          hasOrganizations ? <Navigate to="/dashboard" replace /> : <Navigate to="/onboarding" replace />
        ) : <Auth />
      } />
      <Route path="/onboarding" element={
        user ? (
          hasOrganizations === false ? <Onboarding /> : <Navigate to="/dashboard" replace />
        ) : <Navigate to="/auth" replace />
      } />
      <Route path="/dashboard/:slug?" element={
        user ? <OrganizationDashboard /> : <Navigate to="/auth" replace />
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