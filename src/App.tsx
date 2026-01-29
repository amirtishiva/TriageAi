import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EmergencyProvider } from "@/contexts/EmergencyContext";
import AppLayout from "./components/layout/AppLayout";
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
      <EmergencyProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<NurseDashboard />} />
              <Route path="/intake" element={<PatientIntakePage />} />
              <Route path="/triage" element={<TriageScreen />} />
              <Route path="/triage/:patientId" element={<TriageScreen />} />
              <Route path="/queue" element={<PatientQueue />} />
              <Route path="/trackboard" element={<TrackBoard />} />
              <Route path="/my-patients" element={<TrackBoard />} />
              <Route path="/audit" element={<AuditLogs />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </EmergencyProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
