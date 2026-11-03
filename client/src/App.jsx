import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { LandingHeroPage } from "./pages/LandingHeroPage";
import { DashboardPage } from "./pages/DashboardPage";
import { TransferPage } from "./pages/TransferPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ComplianceCommandCenter } from "./pages/ComplianceCommandCenter";
import { BatchAndFxPage } from "./pages/BatchAndFxPage";
import { ReconciliationAndCorporateWires } from "./pages/ReconciliationAndCorporateWires";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingHeroPage />} />
          <Route path="/hero" element={<LandingHeroPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/batch-fx" element={<BatchAndFxPage />} />
            <Route
              path="/compliance"
              element={
                <RoleProtectedRoute requiredRole="ROLE_COMPLIANCE_OFFICER">
                  <ComplianceCommandCenter />
                </RoleProtectedRoute>
              }
            />
            <Route path="/reconciliation" element={<ReconciliationAndCorporateWires />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
