import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LoginPage from "@/components/auth/LoginPage";
import RegisterPage from "@/components/auth/RegisterPage";
import AppShell from "@/components/layout/AppShell";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectShell from "@/pages/project/ProjectShell";
import InsightsTab from "@/pages/project/tabs/InsightsTab";
import DocumentsTab from "@/pages/project/tabs/DocumentsTab";
import ChatTab from "@/pages/project/tabs/ChatTab";
import GeneratedDocsTab from "@/pages/project/tabs/GeneratedDocsTab";
import DiagramsTab from "@/pages/project/tabs/DiagramsTab";
import SettingsTab from "@/pages/project/tabs/SettingsTab";
import ActivityTimelineTab from "@/pages/project/tabs/ActivityTimelineTab";
import AdminConfigPage from "./pages/AdminConfigPage";
import PortalPage from "./pages/portal/PortalPage";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
              <Route index element={<Navigate to="/projects" replace />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectShell />}>
                <Route index element={<InsightsTab />} />
                <Route path="documents" element={<DocumentsTab />} />
                <Route path="chat" element={<ChatTab />} />
                <Route path="generated" element={<GeneratedDocsTab />} />
                <Route path="diagrams" element={<DiagramsTab />} />
                <Route path="timeline" element={<ActivityTimelineTab />} />
                <Route path="settings" element={<SettingsTab />} />
              </Route>
              <Route path="admin/config" element={<AdminConfigPage />} />
            </Route>
            <Route path="/portal/:token" element={<PortalPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
