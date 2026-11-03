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
                                </span>
                              )}
                              {disc.compensatingJournalId && (
                                <div className="text-[10px] text-zinc-500">
                                  Jnl #{disc.compensatingJournalId} by {disc.resolvedBy}
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              {disc.resolutionStatus === "OPEN" ? (
                                <Button
                                  onClick={() => handleResolveDiscrepancy(disc)}
                                  disabled={resolvingId === disc.id}
                                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-[11px] px-3 py-1.5 rounded-lg shadow-brutal transition-all inline-flex items-center gap-1.5"
                                >
                                  {resolvingId === disc.id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <Scale size={12} />
                                  )}
                                  Post Compensating Adjustment
                                </Button>
                              ) : (
                                <span className="text-zinc-500 text-[11px]">Healed (Nostro Suspense)</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            ) : (
              <CardContent className="py-12 text-center text-zinc-500">
                Click "⚡ Simulate EOD SWIFT Clearing" above to run statement reconciliation.
              </CardContent>
            )}
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MAKER-CHECKER CORPORATE SPEND DESK
          ========================================================================= */}
      {activeTab === "wires" && (
        <div className="space-y-6">
          {/* Wire Submission & Policy Evaluator */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-zinc-900/90 border-2 border-zinc-800 shadow-brutal">
              <CardHeader className="border-b-2 border-zinc-800 pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2 text-white">
                  <UserCheck className="text-yellow-500" size={20} />
                  Corporate Spend Wire Desk
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Enforces automated policy thresholding and FINRA Rule 3110 separation of duties across Alice (Maker), Bob (Checker 1), and Sarah (Checker 2).
                </p>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitCorporateWire} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase font-mono font-bold text-zinc-400 block mb-1">
                        Funding Source Account
                      </label>
                      <select
                        value={wireForm.sourceAccountId}
                        onChange={(e) => setWireForm({ ...wireForm, sourceAccountId: e.target.value })}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 text-white font-mono text-sm rounded-xl p-3 focus:outline-none focus:border-yellow-500"
                      >
                        {accounts.map((acct) => (
                          <option key={acct.id} value={acct.id}>
                            Account #{acct.id} ({acct.accountNumber}) — ${parseFloat(acct.availableBalance).toFixed(2)} USD
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs uppercase font-mono font-bold text-zinc-400 block mb-1">
                        Destination Counterparty Account ID
                      </label>
                      <Input
                        type="number"
                        value={wireForm.destinationAccountId}
                        onChange={(e) => setWireForm({ ...wireForm, destinationAccountId: e.target.value })}
                        placeholder="e.g. 2"
                        className="bg-zinc-950 border-2 border-zinc-800 text-white font-mono"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs uppercase font-mono font-bold text-zinc-400 block mb-1">
                        Wire Amount ($ USD)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={wireForm.amount}
                        onChange={(e) => setWireForm({ ...wireForm, amount: e.target.value })}
                        placeholder="15000.00"
                        className="bg-zinc-950 border-2 border-zinc-800 text-white font-mono font-bold text-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs uppercase font-mono font-bold text-zinc-400 block mb-1">
                        Business Purpose / Reference
                      </label>
                      <Input
                        type="text"
                        value={wireForm.description}
                        onChange={(e) => setWireForm({ ...wireForm, description: e.target.value })}
                        placeholder="Corporate vendor payout"
                        className="bg-zinc-950 border-2 border-zinc-800 text-white font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Dynamic Spend Tier Preview Banner */}
                  <div className={`p-4 rounded-xl border-2 flex items-center justify-between font-mono text-xs ${currentTier.color}`}>
                    <div>
                      <span className="font-black uppercase tracking-wider block">{currentTier.label}</span>
                      <span className="text-[11px] opacity-80">{currentTier.badge}</span>
                    </div>
                    <span className="text-xs font-black uppercase px-2.5 py-1 rounded bg-black/40 border border-current">
                      Signatures: {currentTier.approvals}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    disabled={wireSubmitting}
                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-sm py-3 rounded-xl shadow-brutal transition-all flex items-center justify-center gap-2"
                  >
                    {wireSubmitting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                    Submit Corporate Spend Wire
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Policy Reference Card */}
            <Card className="bg-zinc-900/90 border-2 border-zinc-800 shadow-brutal flex flex-col justify-between">
              <CardHeader className="border-b-2 border-zinc-800 pb-4">
                <CardTitle className="text-sm font-black uppercase tracking-wide text-zinc-300 flex items-center gap-2">
                  <ShieldCheck className="text-yellow-500" size={18} />
                  Corporate Governance Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-zinc-950 border border-emerald-900/50">
                  <div className="text-emerald-400 font-bold uppercase">Tier 1: Under $1,000.00</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">0 Approvals Required • Settles immediately upon submission.</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-amber-900/50">
                  <div className="text-amber-400 font-bold uppercase">Tier 2: $1,000 to $9,999.99</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">1 Checker Approval • Requires independent supervisor signoff.</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-rose-900/50">
                  <div className="text-rose-400 font-bold uppercase">Tier 3: $10,000.00 and Above</div>
                  <div className="text-zinc-400 text-[11px] mt-0.5">2 Distinct Checker Approvals • Requires dual multi-signature signoff before ledger settlement.</div>
                </div>
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                  <strong className="text-white block mb-0.5">FINRA Rule 3110 4-Eyes Rule:</strong>
                  The Maker (submitter) cannot approve their own wire. Checkers must be independent distinct personas.
                </div>
              </CardContent>
            </Card>
          </div>

          {wireAlert && (
            <div
              className={`p-4 rounded-xl border-2 flex items-start gap-3 font-mono text-xs ${
                wireAlert.type === "success"
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/50 text-rose-300"
              }`}
            >
              {wireAlert.type === "success" ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle size={18} className="shrink-0 text-rose-400 mt-0.5" />
              )}
              <div className="flex-1 font-bold">{wireAlert.message}</div>
              <button onClick={() => setWireAlert(null)} className="text-zinc-500 hover:text-white font-bold">
                ✕
              </button>
            </div>
          )}

          {/* Corporate Wires Ledger Table & Multi-Sig Tracker */}
          <Card className="bg-zinc-900/90 border-2 border-zinc-800 shadow-brutal">
            <CardHeader className="border-b-2 border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2 text-white">
                  <Layers className="text-yellow-500" size={20} />
                  Corporate Wire Multi-Signature Audit Queue ({corporateWires.length})
                </CardTitle>
                <Button
                  onClick={async () => {
                    const w = await fetchCorporateWires();
                    setCorporateWires(w);
                  }}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg border border-zinc-700"
                >
                  <RefreshCw size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 uppercase text-[11px]">
                    <tr>
                      <th className="p-3">Wire Key</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Multi-Signature Signoffs</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Supervisory Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {corporateWires.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-zinc-500">
                          No corporate wires registered yet. Submit a wire above to test multi-signature approval.
                        </td>
                      </tr>
                    ) : (
                      corporateWires.map((wire) => {
                        const isPending = wire.status === "PENDING_APPROVAL";
                        const isMaker = activePersonaKey.toLowerCase() === wire.makerUserName?.toLowerCase();
                        const isCheckerOne =
                          wire.checkerOneUserName &&
                          activePersonaKey.toLowerCase() === wire.checkerOneUserName.toLowerCase();

                        return (
                          <tr key={wire.id} className="hover:bg-zinc-900/50 transition-colors">
                            <td className="p-3 font-bold text-white">
                              <div>{wire.idempotencyKey}</div>
                              <div className="text-[10px] text-zinc-500 font-normal truncate max-w-[180px]">
                                {wire.description}
                              </div>
                            </td>
                            <td className="p-3 text-white font-black text-sm">
                              ${parseFloat(wire.amount).toFixed(2)} USD
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  wire.policyTier === "TIER_1_AUTO"
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                                    : wire.policyTier === "TIER_2_SINGLE_CHECKER"
                                    ? "bg-amber-950 text-amber-300 border-amber-700"
                                    : "bg-rose-950 text-rose-300 border-rose-700"
                                }`}
                              >
                                {wire.policyTier}
                              </span>
                            </td>

                            {/* Multi-Signature Visual Tracker */}
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {/* Maker */}
                                <div className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-[10px]">
                                  <UserCheck size={10} className="text-emerald-400" />
                                  <span className="text-zinc-400">Maker:</span>
                                  <span className="font-bold text-white">{wire.makerUserName}</span>
                                </div>

                                <ArrowRight size={10} className="text-zinc-600" />

                                {/* Checker 1 */}
                                {wire.requiredApprovals >= 1 && (
                                  <div
                                    className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] ${
                                      wire.checkerOneUserName
                                        ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                                        : "bg-zinc-900 border-dashed border-zinc-700 text-zinc-500"
                                    }`}
                                  >
                                    <ShieldCheck size={10} />
                                    <span>Chk 1:</span>
                                    <span className="font-bold">
                                      {wire.checkerOneUserName || "Pending"}
                                    </span>
                                  </div>
                                )}

                                {/* Checker 2 */}
                                {wire.requiredApprovals >= 2 && (
                                  <>
                                    <ArrowRight size={10} className="text-zinc-600" />
                                    <div
                                      className={`flex items-center gap-1 px-2 py-1 rounded border text-[10px] ${
                                        wire.checkerTwoUserName
                                          ? "bg-emerald-950/40 border-emerald-500 text-emerald-300"
                                          : "bg-zinc-900 border-dashed border-zinc-700 text-zinc-500"
                                      }`}
                                    >
                                      <ShieldCheck size={10} />
                                      <span>Chk 2:</span>
                                      <span className="font-bold">
                                        {wire.checkerTwoUserName || "Pending"}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>

                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                  wire.status === "SETTLED"
                                    ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                                    : "bg-amber-950 text-amber-300 border-amber-500"
                                }`}
                              >
                                {wire.status}
                              </span>
                              {wire.settledJournalEntryId && (
                                <div className="text-[10px] text-zinc-500">
                                  Settled Jnl #{wire.settledJournalEntryId}
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-2">
                                  {isMaker && (
                                    <span className="text-[10px] text-rose-400 font-bold border border-rose-900/50 bg-rose-950/30 px-2 py-0.5 rounded">
                                      Self-Approval Forbidden
                                    </span>
                                  )}
                                  <Button
                                    onClick={() => handleApproveWire(wire)}
                                    disabled={wireApprovingId === wire.id}
                                    className={`text-[11px] px-3 py-1.5 rounded-lg shadow-brutal transition-all inline-flex items-center gap-1.5 font-black uppercase ${
                                      isMaker
                                        ? "bg-zinc-800 text-zinc-400 hover:bg-rose-950 hover:text-rose-300 border border-zinc-700"
                                        : "bg-yellow-500 hover:bg-yellow-400 text-black"
                                    }`}
                                  >
                                    {wireApprovingId === wire.id ? (
                                      <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                      <UserCheck size={12} />
                                    )}
                                    Sign as {activePersonaKey}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-emerald-400 text-[11px] font-bold">
                                  ✓ Settled on Double-Entry Ledger
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: REAL-TIME SRE & LEDGER TELEMETRY
          ========================================================================= */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <Card className="bg-zinc-900/90 border-2 border-zinc-800 shadow-brutal">
            <CardHeader className="border-b-2 border-zinc-800 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-black uppercase tracking-wide flex items-center gap-2 text-white">
                    <Activity className="text-yellow-500" size={20} />
                    Live Supervisory SRE & Treasury Telemetry
                  </CardTitle>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Real-time aggregation from MySQL double-entry ledger, outbox relay, dead-letter queue, and cryptographic SHA-256 audit chain.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={refreshTelemetry}
                    disabled={telemetryLoading}
                    className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-xs px-4 py-2.5 rounded-xl border-2 border-zinc-700 flex items-center gap-2"
                  >
                    <RefreshCw size={14} className={telemetryLoading ? "animate-spin" : ""} />
                    Refresh Metrics
                  </Button>
                  <Button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`font-bold uppercase text-xs px-4 py-2.5 rounded-xl border-2 transition-all ${
                      autoRefresh
                        ? "bg-emerald-950 text-emerald-300 border-emerald-500"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    Auto-Poll (3s): {autoRefresh ? "ON" : "OFF"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {telemetry ? (
                <div className="space-y-6">
                  {/* Top Counters Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-950 p-5 rounded-2xl border-2 border-zinc-800 shadow-brutal">
                      <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                        Total Posted Liquidity (USD)
                      </span>
                      <span className="text-2xl font-black text-white font-mono">
                        ${parseFloat(telemetry.totalPostedLiquidityUsd || 0).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="bg-zinc-950 p-5 rounded-2xl border-2 border-zinc-800 shadow-brutal">
                      <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                        Cryptographic SHA-256 Chain
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {telemetry.sha256ChainVerified ? (
                          <>
                            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 font-black font-mono text-lg uppercase">
                              VERIFIED INTACT
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="w-3 h-3 rounded-full bg-rose-500" />
                            <span className="text-rose-400 font-black font-mono text-lg uppercase">
                              UNVERIFIED
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-950 p-5 rounded-2xl border-2 border-zinc-800 shadow-brutal">
                      <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                        Active Balance Holds
                      </span>
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        {telemetry.activeHoldsCount}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-mono">Pending AML Review</span>
                    </div>

                    <div className="bg-zinc-950 p-5 rounded-2xl border-2 border-zinc-800 shadow-brutal">
                      <span className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                        Open Recon Discrepancies
                      </span>
                      <span className="text-2xl font-black text-rose-400 font-mono">
                        {telemetry.openReconciliationDiscrepancies}
                      </span>
                      <span className="text-[10px] text-zinc-500 block font-mono">Requires Nostro Healing</span>
                    </div>
                  </div>

                  {/* Secondary Counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                        Pending Maker-Checker Wires
                      </span>
                      <span className="text-xl font-bold text-white font-mono">
                        {telemetry.pendingMakerCheckerWires}
                      </span>
                    </div>

                    <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                        Outbox Pending Events
                      </span>
                      <span className="text-xl font-bold text-yellow-400 font-mono">
                        {telemetry.outboxPendingCount}
                      </span>
                    </div>

                    <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                        Dead Letter Queue (DLQ)
                      </span>
                      <span className="text-xl font-bold text-rose-400 font-mono">
                        {telemetry.dlqCount}
                      </span>
                    </div>

                    <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">
                        MCP Auto-Executions
                      </span>
                      <span className="text-xl font-bold text-emerald-400 font-mono">
                        {telemetry.mcpAutoExecutionsCount}
                      </span>
                    </div>
                  </div>

                  {/* Diagnostic Footer */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono flex items-center justify-between text-zinc-500">
                    <div>
                      <span>Telemetry Timestamp: </span>
                      <span className="text-zinc-300">{telemetry.timestamp || new Date().toISOString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400 uppercase font-bold text-[11px]">
                        Dual-Entry Invariant Net-Zero Guaranteed
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 font-mono">
                  Loading real-time telemetry metrics...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Custom JSON Statement Input */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-black uppercase text-white flex items-center gap-2">
              <FileText className="text-yellow-500" size={20} />
              Run Custom SWIFT MT940 Clearing Batch
            </h3>
            <p className="text-xs text-zinc-400 font-mono">
              Paste a JSON array of external statement lines with idempotencyKey, sourceAccountId, destinationAccountId, amount, and currency.
            </p>
            <textarea
              rows={8}
              value={customJsonInput}
              onChange={(e) => setCustomJsonInput(e.target.value)}
              placeholder={`[\n  {\n    "idempotencyKey": "WIRE-EXT-01",\n    "sourceAccountId": 1,\n    "destinationAccountId": 2,\n    "amount": 120.00,\n    "currency": "USD"\n  }\n]`}
              className="w-full bg-zinc-950 border-2 border-zinc-800 text-white font-mono text-xs rounded-xl p-3 focus:outline-none focus:border-yellow-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                onClick={() => setShowCustomModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRunCustomStatement}
                disabled={reconLoading || !customJsonInput.trim()}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold uppercase text-xs px-5 py-2 rounded-xl shadow-brutal"
              >
                Run Statement Reconciliation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
