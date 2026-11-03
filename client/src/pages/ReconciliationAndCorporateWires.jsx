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
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("runestone_persona_changed", handlePersonaChange);
  }, []);

  // Accounts
  const [accounts, setAccounts] = useState([]);

  // ================= TAB 1: RECONCILIATION STATE =================
  const [reconRuns, setReconRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [reconLoading, setReconLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState(null);
  const [reconAlert, setReconAlert] = useState(null); // { type: "success" | "error", message: "" }

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
  const [wireAlert, setWireAlert] = useState(null); // { type: "success" | "error", message: "" }

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
    } catch (err) {
      console.error("Failed loading initial data:", err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load discrepancies for a run
  const loadDiscrepancies = async (runId) => {
    try {
      const list = await fetchReconciliationDiscrepancies(runId);
      setDiscrepancies(list || []);
    } catch (err) {
      console.error("Failed loading discrepancies:", err);
    }
  };

  // Auto-refresh telemetry interval
  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(async () => {
        try {
          const telem = await fetchTelemetryMetrics();
          setTelemetry(telem);
        } catch (err) {
          console.error("Telemetry poll failed:", err);
        }
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  // Handler: Run EOD Reconciliation Simulation
  const handleSimulateEodStatement = async () => {
    setReconLoading(true);
    setReconAlert(null);
    try {
      const result = await runEodStatement(true);
      setReconAlert({
        type: "success",
        message: `EOD SWIFT MT940 statement executed! Run #${result.id} (${result.statementReference}) completed with status: ${result.status}`,
      });
      const runs = await fetchReconciliationRuns();
      setReconRuns(runs);
      setSelectedRun(result);
      await loadDiscrepancies(result.id);
      refreshTelemetry();
    } catch (err) {
      setReconAlert({
        type: "error",
        message: err.message || "Failed running EOD SWIFT reconciliation simulation",
      });
    } finally {
      setReconLoading(false);
    }
  };

  // Handler: Run Custom Statement JSON
  const handleRunCustomStatement = async () => {
    if (!customJsonInput.trim()) return;
    setReconLoading(true);
    setReconAlert(null);
    try {
      const lines = JSON.parse(customJsonInput);
      const result = await runEodStatement(false, lines);
      setReconAlert({
        type: "success",
        message: `Custom statement executed! Run #${result.id} (${result.statementReference}) status: ${result.status}`,
      });
      setShowCustomModal(false);
      setCustomJsonInput("");
      const runs = await fetchReconciliationRuns();
      setReconRuns(runs);
      setSelectedRun(result);
      await loadDiscrepancies(result.id);
      refreshTelemetry();
    } catch (err) {
      setReconAlert({
        type: "error",
        message: err.message || "Invalid JSON or failed to process statement",
      });
    } finally {
      setReconLoading(false);
    }
  };

  // Handler: Resolve Discrepancy
  const handleResolveDiscrepancy = async (discrepancy) => {
    setResolvingId(discrepancy.id);
    setReconAlert(null);
    try {
      const notes = `Supervisor ${activePersonaKey} authorized automated compensating journal adjustment via Nostro suspense account AC-SYS-NOSTRO-USD.`;
      const resolved = await resolveDiscrepancy(discrepancy.id, notes);
      setReconAlert({
        type: "success",
        message: `Discrepancy #${discrepancy.id} (${discrepancy.discrepancyType}) healed! Compensating Journal #${resolved.compensatingJournalId || "SETTLED"} posted via Nostro suspense.`,
      });
      if (selectedRun) {
        await loadDiscrepancies(selectedRun.id);
        const runs = await fetchReconciliationRuns();
        setReconRuns(runs);
        const updatedRun = runs.find((r) => r.id === selectedRun.id);
        if (updatedRun) setSelectedRun(updatedRun);
      }
      refreshTelemetry();
    } catch (err) {
      setReconAlert({
        type: "error",
        message: err.message || `Failed resolving discrepancy #${discrepancy.id}`,
      });
    } finally {
      setResolvingId(null);
    }
  };

  // Helper: Compute Wire Tier dynamically
  const computeWireTier = (amountStr) => {
    const amt = parseFloat(amountStr) || 0;
    if (amt < 1000) {
      return {
        tier: "TIER_1_AUTO",
        label: "TIER 1 (AUTO-SETTLED)",
        approvals: 0,
        color: "text-emerald-400 border-emerald-500/50 bg-emerald-950/30",
        badge: "Auto-Settles Instantly",
      };
    } else if (amt < 10000) {
      return {
        tier: "TIER_2_SINGLE_CHECKER",
        label: "TIER 2 (SINGLE CHECKER)",
        approvals: 1,
        color: "text-amber-400 border-amber-500/50 bg-amber-950/30",
        badge: "Requires 1 Supervisory Approval",
      };
    } else {
      return {
        tier: "TIER_3_DUAL_CHECKER",
        label: "TIER 3 (DUAL CHECKER)",
        approvals: 2,
        color: "text-rose-400 border-rose-500/50 bg-rose-950/30",
        badge: "Requires 2 Distinct Approvals",
      };
    }
  };

  // Handler: Submit Corporate Spend Wire
  const handleSubmitCorporateWire = async (e) => {
    e.preventDefault();
    setWireSubmitting(true);
    setWireAlert(null);
    try {
      const payload = {
        sourceAccountId: parseInt(wireForm.sourceAccountId, 10),
        destinationAccountId: parseInt(wireForm.destinationAccountId, 10),
        amount: parseFloat(wireForm.amount),
        currency: "USD",
        description: wireForm.description,
      };

      const result = await submitCorporateWire(payload);
      const tierInfo = computeWireTier(wireForm.amount);

      setWireAlert({
        type: "success",
        message:
          result.status === "SETTLED"
            ? `Corporate wire #${result.idempotencyKey} auto-settled immediately on double-entry ledger (${result.policyTier})!`
            : `Corporate wire #${result.idempotencyKey} submitted under ${result.policyTier}. Status: PENDING_APPROVAL (${result.currentApprovals}/${result.requiredApprovals} approvals required).`,
      });

      const updatedWires = await fetchCorporateWires();
      setCorporateWires(updatedWires);
      refreshTelemetry();
    } catch (err) {
      setWireAlert({
        type: "error",
        message: err.message || "Failed to submit corporate wire",
      });
    } finally {
      setWireSubmitting(false);
    }
  };

  // Handler: Approve Corporate Wire
  const handleApproveWire = async (wire) => {
    setWireApprovingId(wire.id);
    setWireAlert(null);
    try {
      const notes = `Supervisory approval by ${activePersonaKey} via Corporate Spend Desk.`;
      const result = await approveCorporateWire(wire.id, notes);
      setWireAlert({
        type: "success",
