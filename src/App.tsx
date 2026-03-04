import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DoctorDashboard from "./pages/DoctorDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import MobileModule from "./pages/MobileModule";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ role, children }: { role: string; children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a10 10 0 100 20A10 10 0 0012 2zm0 3a1 1 0 011 1v5.586l3.707 3.707a1 1 0 01-1.414 1.414l-4-4A1 1 0 0111 12V6a1 1 0 011-1z" />
          </svg>
        </div>
        <p className="text-sm text-muted-foreground font-medium">Loading CureSense...</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== role) return <Navigate to={`/${user?.role}`} replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to={`/${user?.role}`} replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={isAuthenticated ? `/${user?.role}` : '/login'} replace />} />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/doctor/*" element={<ProtectedRoute role="doctor"><DoctorDashboard /></ProtectedRoute>} />

      <Route path="/patient" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />
      <Route path="/patient/*" element={<ProtectedRoute role="patient"><PatientDashboard /></ProtectedRoute>} />

      <Route path="/nurse" element={<ProtectedRoute role="nurse"><NurseDashboard /></ProtectedRoute>} />
      <Route path="/nurse/*" element={<ProtectedRoute role="nurse"><NurseDashboard /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/*" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />

      <Route path="/mobile-demo" element={<MobileModule />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
