import { useState, useEffect, useCallback } from "react";
import {
  Scale,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Activity,
  DollarSign,
  Layers,
  Sparkles,
  Zap,
  Clock,
  Eye,
  FileText,
  UserCheck,
  Building,
} from "lucide-react";
import {
  runEodStatement,
  fetchReconciliationRuns,
  fetchReconciliationDiscrepancies,
  resolveDiscrepancy,
  submitCorporateWire,
  approveCorporateWire,
  fetchCorporateWires,
  fetchTelemetryMetrics,
  fetchUserAccounts,
  getActivePersona,
  PERSONAS,
} from "../api/treasuryApi";

export function ReconciliationAndCorporateWires() {
  const [activeTab, setActiveTab] = useState("recon"); // "recon" | "wires" | "telemetry"
  const [activePersonaKey, setActivePersonaKey] = useState(getActivePersona());

  // Listen for persona changes
  useEffect(() => {
    const handlePersonaChange = (e) => {
      setActivePersonaKey(e.detail || getActivePersona());
    };
    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => {
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
    };
  }, []);

  // Accounts
  const [accounts, setAccounts] = useState([]);

  // ================= TAB 1: RECONCILIATION STATE =================
  const [reconRuns, setReconRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [reconLoading, setReconLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [reconAlert, setReconAlert] = useState(null);

  // Custom Statement JSON input modal / state
  const [customJsonInput, setCustomJsonInput] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // ================= TAB 2: MAKER-CHECKER WIRES STATE =================
  const [corporateWires, setCorporateWires] = useState([]);
  const [wiresLoading, setWiresLoading] = useState(false);
  const [wireForm, setWireForm] = useState({
    sourceAccountId: "1",
    destinationAccountId: "2",
    amount: "15000.00",
    description: "Corporate Vendor Settlement (Q4 Infrastructure)",
  });
  const [wireSubmitting, setWireSubmitting] = useState(false);
  const [wireApprovingId, setWireApprovingId] = useState(null);
  const [wireAlert, setWireAlert] = useState(null);

  // ================= TAB 3: TELEMETRY STATE =================
  const [telemetry, setTelemetry] = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Initial Data Loading
  const loadInitialData = useCallback(async () => {
    try {
      const accts = await fetchUserAccounts().catch(() => []);
      setAccounts(accts || []);

      const runs = await fetchReconciliationRuns().catch(() => []);
      setReconRuns(runs || []);
      if (runs && runs.length > 0) {
        setSelectedRun(runs[0]);
        loadDiscrepancies(runs[0].id);
      }

      const wires = await fetchCorporateWires().catch(() => []);
      setCorporateWires(wires || []);

      const telem = await fetchTelemetryMetrics().catch(() => null);
      setTelemetry(telem);
    } catch (e) {
      console.error("Initial load failed:", e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load discrepancies for a run
  const loadDiscrepancies = async (runId) => {
    try {
      const data = await fetchReconciliationDiscrepancies(runId);
      setDiscrepancies(data || []);
    } catch (e) {
      console.error("Failed to load discrepancies:", e);
    }
  };

  // EOD Simulation Trigger (3 Split-Brain Anomalies)
  const handleSimulateEodStatement = async () => {
    setReconLoading(true);
    setReconAlert(null);
    try {
      const sampleStatement = {
        statementDate: new Date().toISOString().split("T")[0],
        nostroAccountNumber: "AC-SYS-NOSTRO-USD",
        lines: [
          {
            transactionReference: "SWIFT-TX-001",
            idempotencyKey: "tx-settled-matched",
            amount: 50.0,
            currency: "USD",
            bookingDateTime: new Date().toISOString(),
            lineType: "CREDIT",
          },
          {
            transactionReference: "SWIFT-TX-SPLIT-1",
            idempotencyKey: "tx-unmatched-external-bank-credit",
            amount: 1250.0,
            currency: "USD",
            bookingDateTime: new Date().toISOString(),
            lineType: "CREDIT",
          },
          {
            transactionReference: "SWIFT-TX-SPLIT-2",
            idempotencyKey: "tx-50-dollar-mismatch",
            amount: 55.0,
            currency: "USD",
            bookingDateTime: new Date().toISOString(),
            lineType: "DEBIT",
          },
        ],
      };

      const result = await runEodStatement(sampleStatement);
      setReconAlert({
        type: "success",
        message: `EOD Statement #${result.id} cleared: Parity Status ${result.status}. Flagged ${result.unmatchedCount} split-brain anomalies and ${result.amountMismatchCount} amount discrepancies.`,
      });

      const updatedRuns = await fetchReconciliationRuns();
      setReconRuns(updatedRuns || []);
      setSelectedRun(result);
      await loadDiscrepancies(result.id);
    } catch (e) {
      setReconAlert({
        type: "error",
        message: e.message || "Failed to execute EOD reconciliation statement.",
      });
    } finally {
      setReconLoading(false);
    }
  };
