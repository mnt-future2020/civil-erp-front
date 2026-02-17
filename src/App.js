import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";
import Layout from "./components/layout/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Financial from "./pages/Financial";
import Procurement from "./pages/Procurement";
import HRMS from "./pages/HRMS";
import Compliance from "./pages/Compliance";
import Reports from "./pages/Reports";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";
import EInvoicing from "./pages/EInvoicing";
import ProjectDetail from "./pages/ProjectDetail";
import Inventory from "./pages/Inventory";

// Protected Route wrapper
const ProtectedRoute = ({ children, module }) => {
  const { isAuthenticated, loading, canViewModule } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (module && !canViewModule(module)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Public Route wrapper
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute module="dashboard">
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects"
        element={
          <ProtectedRoute module="projects">
            <Projects />
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute module="projects">
            <ProjectDetail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/financial"
        element={
          <ProtectedRoute module="financial">
            <Financial />
          </ProtectedRoute>
        }
      />

      <Route
        path="/procurement"
        element={
          <ProtectedRoute module="procurement">
            <Procurement />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hrms"
        element={
          <ProtectedRoute module="hrms">
            <HRMS />
          </ProtectedRoute>
        }
      />

      <Route
        path="/compliance"
        element={
          <ProtectedRoute module="compliance">
            <Compliance />
          </ProtectedRoute>
        }
      />

      <Route
        path="/reports"
        element={
          <ProtectedRoute module="reports">
            <Reports />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-assistant"
        element={
          <ProtectedRoute module="ai_assistant">
            <AIAssistant />
          </ProtectedRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute module="settings">
            <Settings />
          </ProtectedRoute>
        }
      />

      <Route
        path="/einvoicing"
        element={
          <ProtectedRoute module="einvoicing">
            <EInvoicing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/inventory"
        element={
          <ProtectedRoute module="inventory">
            <Inventory />
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
