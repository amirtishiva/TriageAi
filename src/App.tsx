import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { EmergencyProvider } from "@/contexts/EmergencyContext";
import { AuthProvider } from "@/contexts/AuthContext";

// Layouts
import NurseLayout from "./components/layout/NurseLayout";
import PhysicianLayout from "./components/layout/PhysicianLayout";

// Pages
import LandingPage from "./pages/LandingPage";
import RolePortal from "./pages/RolePortal";
import AuthPage from "./pages/AuthPage";
import NurseDashboard from "./pages/NurseDashboard";
import PatientIntakePage from "./pages/PatientIntakePage";
import TriageScreen from "./pages/TriageScreen";
import PatientQueue from "./pages/PatientQueue";
import TrackBoard from "./pages/TrackBoard";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EmergencyProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/portal" element={<RolePortal />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Nurse Station Routes */}
              <Route path="/nurse" element={<NurseLayout />}>
                <Route index element={<NurseDashboard />} />
                <Route path="intake" element={<PatientIntakePage />} />
                <Route path="triage" element={<TriageScreen />} />
                <Route path="triage/:patientId" element={<TriageScreen />} />
                <Route path="queue" element={<PatientQueue />} />
              </Route>

              {/* Physician Workbench Routes */}
              <Route path="/physician" element={<PhysicianLayout />}>
                <Route index element={<TrackBoard />} />
                <Route path="my-patients" element={<TrackBoard />} />
                <Route path="audit" element={<AuditLogs />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* Legacy route redirects for backward compatibility */}
              <Route path="/intake" element={<Navigate to="/nurse/intake" replace />} />
              <Route path="/triage" element={<Navigate to="/nurse/triage" replace />} />
              <Route path="/triage/:patientId" element={<Navigate to="/nurse/triage/:patientId" replace />} />
              <Route path="/queue" element={<Navigate to="/nurse/queue" replace />} />
              <Route path="/trackboard" element={<Navigate to="/physician" replace />} />
              <Route path="/my-patients" element={<Navigate to="/physician/my-patients" replace />} />
              <Route path="/audit" element={<Navigate to="/physician/audit" replace />} />
              <Route path="/settings" element={<Navigate to="/physician/settings" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </EmergencyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
