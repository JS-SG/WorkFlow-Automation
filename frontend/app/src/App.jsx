import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import WorkflowList from "./pages/WorkflowList";
import WorkflowEditor from "./pages/WorkflowEditor";
import ExecutionPage from "./pages/ExecutionPage";
import AuditLog from "./pages/AuditLog";
import Notifications from "./pages/Notifications";
import PendingApprovals from "./pages/PendingApprovals";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<WorkflowList />} />
                <Route path="/workflows/:id/edit" element={<WorkflowEditor />} />
                <Route path="/execute/:id" element={<ExecutionPage />} />
                <Route path="/approvals" element={<PendingApprovals />} />
                <Route path="/workflow/execution/:executionId" element={<ExecutionPage />} />
                <Route path="/audit" element={<AuditLog />} />
                <Route path="/notifications" element={<Notifications />} />
              </Route>

              <Route path="/create" element={<Navigate to="/" replace />} />
              <Route path="/rules" element={<Navigate to="/" replace />} />
              <Route path="/execute" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;