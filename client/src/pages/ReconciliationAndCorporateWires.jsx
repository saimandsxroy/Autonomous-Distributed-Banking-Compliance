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
        message:
          result.status === "SETTLED"
            ? `Corporate Wire #${wire.id} FULLY APPROVED and settled on double-entry ledger! Journal Entry #${result.settledJournalEntryId || "SETTLED"}.`
            : `Corporate Wire #${wire.id} approved by ${activePersonaKey}. Current progress: ${result.currentApprovals}/${result.requiredApprovals} signatures.`,
      });
      const updatedWires = await fetchCorporateWires();
      setCorporateWires(updatedWires);
      refreshTelemetry();
    } catch (err) {
      setWireAlert({
        type: "error",
        message: err.message || `Approval rejected for wire #${wire.id}`,
      });
    } finally {
      setWireApprovingId(null);
    }
  };

  // Helper: Refresh Telemetry Metrics
  const refreshTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const telem = await fetchTelemetryMetrics();
      setTelemetry(telem);
    } catch (err) {
      console.error("Failed fetching telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  const currentTier = computeWireTier(wireForm.amount);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="border-b-4 border-zinc-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-500">
              <Scale size={28} />
            </span>
            <div>
              <h1 className="text-3xl font-black tracking-tight uppercase">
                Reconciliation & Corporate Spend Desk
              </h1>
              <p className="text-sm font-mono text-zinc-400 mt-0.5">
                Phase 11: EOD Nostro/Vostro Split-Brain Healing • Phase 12: FINRA Multi-Tier Maker-Checker
              </p>
            </div>
          </div>
        </div>

        {/* Persona Indicator */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-brutal self-start md:self-auto">
          <Building size={18} className="text-yellow-500 shrink-0" />
          <div className="text-xs font-mono">
            <span className="text-zinc-400">Signer Identity: </span>
            <span className="text-white font-bold">{PERSONAS[activePersonaKey]?.displayName || activePersonaKey}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("recon")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border-2 ${
            activeTab === "recon"
              ? "bg-yellow-500 text-black border-yellow-500 shadow-brutal"
              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
          }`}
        >
          <FileCheck size={16} />
          EOD Nostro/Vostro Statement Reconciliation
        </button>
        <button
          onClick={() => setActiveTab("wires")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border-2 ${
            activeTab === "wires"
              ? "bg-yellow-500 text-black border-yellow-500 shadow-brutal"
              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
          }`}
        >
          <UserCheck size={16} />
          Maker-Checker Corporate Spend Desk
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition-all border-2 ${
            activeTab === "telemetry"
              ? "bg-yellow-500 text-black border-yellow-500 shadow-brutal"
              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
          }`}
        >
          <Activity size={16} />
          Real-Time SRE & Ledger Telemetry
        </button>
      </div>

      {/* =========================================================================
          TAB 1: EOD NOSTRO/VOSTRO RECONCILIATION
          ========================================================================= */}
      {activeTab === "recon" && (
        <div className="space-y-6">
          {/* Action Trigger Card */}
          <Card className="bg-zinc-900/90 border-2 border-zinc-800 shadow-brutal">
            <CardHeader className="border-b-2 border-zinc-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2 text-white">
                    <Sparkles className="text-yellow-500" size={20} />
                    SWIFT MT940 End-of-Day Statement Clearing Engine
                  </CardTitle>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Performs an O(N) idempotency-keyed comparison between external bank clearing lines and internal double-entry journals.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSimulateEodStatement}
                    disabled={reconLoading}
                    className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs px-5 py-2.5 rounded-xl shadow-brutal transition-all flex items-center gap-2"
                  >
                    {reconLoading ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} />
                    )}
                    ⚡ Simulate EOD SWIFT Clearing (Inject 3 Split-Brain Anomalies)
                  </Button>
                  <Button
                    onClick={() => setShowCustomModal(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-xs px-4 py-2.5 rounded-xl border-2 border-zinc-700"
                  >
                    Custom JSON Statement
                  </Button>
                </div>
              </div>
            </CardHeader>

            {reconAlert && (
              <div
                className={`m-6 p-4 rounded-xl border-2 flex items-start gap-3 font-mono text-xs ${
                  reconAlert.type === "success"
                    ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                    : "bg-rose-950/40 border-rose-500/50 text-rose-300"
                }`}
              >
                {reconAlert.type === "success" ? (
                  <CheckCircle2 size={18} className="shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
                )}
                <div className="flex-1 font-bold">{reconAlert.message}</div>
                <button
                  onClick={() => setReconAlert(null)}
                  className="text-zinc-500 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Run KPI Cards */}
            {selectedRun ? (
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
                  <div>
                    <span className="text-xs uppercase font-mono text-zinc-400">Statement Reference: </span>
                    <span className="text-sm font-mono font-black text-yellow-400 ml-1">
                      {selectedRun.statementReference}
                    </span>
                    <span className="text-xs text-zinc-500 ml-3">
                      (Run #{selectedRun.id} • Executed by {selectedRun.executedBy})
                    </span>
                  </div>

                  {/* Previous Runs Selector */}
                  {reconRuns.length > 1 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400 font-mono">History:</span>
                      <select
                        value={selectedRun.id}
                        onChange={(e) => {
                          const r = reconRuns.find((x) => x.id === parseInt(e.target.value, 10));
                          if (r) {
                            setSelectedRun(r);
                            loadDiscrepancies(r.id);
                          }
                        }}
                        className="bg-zinc-800 border border-zinc-700 text-xs rounded px-2.5 py-1 text-white font-mono"
                      >
                        {reconRuns.map((r) => (
                          <option key={r.id} value={r.id}>
                            #{r.id} ({r.statementReference.slice(-10)}) — {r.status}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 block">Total Records</span>
                    <span className="text-2xl font-black text-white">{selectedRun.totalExternalRecords}</span>
                  </div>
                  <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-900/40">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 block">Matched (Clean)</span>
                    <span className="text-2xl font-black text-emerald-400">{selectedRun.matchedCount}</span>
                  </div>
                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-900/40">
                    <span className="text-[10px] font-mono uppercase text-rose-400 block">Missing Internal</span>
                    <span className="text-2xl font-black text-rose-400">{selectedRun.missingInternalCount}</span>
                  </div>
                  <div className="bg-amber-950/20 p-4 rounded-xl border border-amber-900/40">
                    <span className="text-[10px] font-mono uppercase text-amber-400 block">Missing External</span>
                    <span className="text-2xl font-black text-amber-400">{selectedRun.missingExternalCount}</span>
                  </div>
                  <div className="bg-orange-950/20 p-4 rounded-xl border border-orange-900/40">
                    <span className="text-[10px] font-mono uppercase text-orange-400 block">Amount Mismatch</span>
                    <span className="text-2xl font-black text-orange-400">{selectedRun.amountMismatchCount}</span>
                  </div>
                </div>

                {/* Status Header */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <Scale size={16} className="text-yellow-500" />
                    Discrepancy Audit & Compensating Adjustment Table ({discrepancies.length} Items)
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase border ${
                      selectedRun.status === "RECONCILED_CLEAN"
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                        : selectedRun.status === "RESOLVED"
                        ? "bg-blue-950 text-blue-300 border-blue-500"
                        : "bg-rose-950 text-rose-300 border-rose-500"
                    }`}
                  >
                    {selectedRun.status}
                  </span>
                </div>

                {/* Discrepancies Table */}
                <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase text-[11px]">
                      <tr>
                        <th className="p-3">#ID</th>
                        <th className="p-3">Discrepancy Type</th>
                        <th className="p-3">Idempotency Key</th>
                        <th className="p-3">External Amount</th>
                        <th className="p-3">Internal Amount</th>
                        <th className="p-3">Resolution Status</th>
                        <th className="p-3 text-right">Compensating Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {discrepancies.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="p-8 text-center text-zinc-500">
                            No discrepancies in this run — 100% ledger parity achieved.
                          </td>
                        </tr>
                      ) : (
                        discrepancies.map((disc) => (
                          <tr key={disc.id} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="p-3 font-bold text-white">#{disc.id}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  disc.discrepancyType === "MISSING_INTERNAL"
                                    ? "bg-rose-950 text-rose-300 border-rose-700"
                                    : disc.discrepancyType === "AMOUNT_MISMATCH"
                                    ? "bg-orange-950 text-orange-300 border-orange-700"
                                    : "bg-amber-950 text-amber-300 border-amber-700"
                                }`}
                              >
                                {disc.discrepancyType}
                              </span>
                            </td>
                            <td className="p-3 text-zinc-300 font-bold truncate max-w-[140px]">
                              {disc.idempotencyKey}
                            </td>
                            <td className="p-3 text-white font-bold">
                              {disc.externalAmount != null ? `$${parseFloat(disc.externalAmount).toFixed(2)}` : "—"}
                            </td>
                            <td className="p-3 text-zinc-400">
                              {disc.internalAmount != null ? `$${parseFloat(disc.internalAmount).toFixed(2)}` : "—"}
                            </td>
                            <td className="p-3">
                              {disc.resolutionStatus === "OPEN" ? (
                                <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
                                  <AlertTriangle size={12} /> OPEN
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <CheckCircle2 size={12} /> COMPENSATED
