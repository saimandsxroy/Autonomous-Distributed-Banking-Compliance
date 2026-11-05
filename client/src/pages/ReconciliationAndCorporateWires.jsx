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

  const handleRunCustomJson = async () => {
    setReconLoading(true);
    setReconAlert(null);
    setShowCustomModal(false);
    try {
      const parsed = JSON.parse(customJsonInput);
      const result = await runEodStatement(parsed);
      setReconAlert({
        type: "success",
        message: `Custom EOD Statement #${result.id} processed: ${result.status}`,
      });
      const updatedRuns = await fetchReconciliationRuns();
      setReconRuns(updatedRuns || []);
      setSelectedRun(result);
      await loadDiscrepancies(result.id);
    } catch (e) {
      setReconAlert({
        type: "error",
        message: `JSON parse or execution failed: ${e.message}`,
      });
    } finally {
      setReconLoading(false);
    }
  };

  const handleResolveDiscrepancy = async (disc) => {
    setResolvingId(disc.id);
    setReconAlert(null);
    try {
      const res = await resolveDiscrepancy(disc.id, {
        decision: "ADJUST_POSTING",
        reason: "Compensating adjusting journal posted via Nostro Suspense pool.",
        resolvedBy: activePersonaKey,
      });

      setReconAlert({
        type: "success",
        message: `Discrepancy #${disc.id} healed! Posted Compensating Journal #${res.compensatingJournalId}.`,
      });

      if (selectedRun) {
        await loadDiscrepancies(selectedRun.id);
        const runs = await fetchReconciliationRuns();
        setReconRuns(runs || []);
        const refreshedRun = runs.find((r) => r.id === selectedRun.id);
        if (refreshedRun) setSelectedRun(refreshedRun);
      }
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (e) {
      setReconAlert({
        type: "error",
        message: e.message || "Failed to resolve discrepancy.",
      });
    } finally {
      setResolvingId(null);
    }
  };

  const handleSubmitCorporateWire = async (e) => {
    e.preventDefault();
    setWireSubmitting(true);
    setWireAlert(null);

    try {
      const payload = {
        sourceAccountId: parseInt(wireForm.sourceAccountId),
        destinationAccountId: parseInt(wireForm.destinationAccountId),
        amount: parseFloat(wireForm.amount),
        currency: "USD",
        businessPurpose: wireForm.description,
      };

      const result = await submitCorporateWire(payload);
      setWireAlert({
        type: "success",
        message: `Corporate Spend Wire #${result.id} created (${result.governanceTier}). Status: ${result.status}. Required Approvals: ${result.requiredApprovalsCount}.`,
      });

      const updatedWires = await fetchCorporateWires();
      setCorporateWires(updatedWires || []);
      setWireForm({
        ...wireForm,
        description: "",
      });
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (e) {
      setWireAlert({
        type: "error",
        message: e.message || "Wire submission rejected.",
      });
    } finally {
      setWireSubmitting(false);
    }
  };

  const handleApproveWire = async (wire) => {
    setWireApprovingId(wire.id);
    setWireAlert(null);

    try {
      const result = await approveCorporateWire(wire.id, {
        decision: "APPROVE",
        comments: `Signed and verified by ${activePersonaKey} under FINRA 3110 policy.`,
        reviewer: activePersonaKey,
      });

      setWireAlert({
        type: "success",
        message: `Signature verified! Wire #${wire.id} updated. Current status: ${result.status}. Approved by: ${result.approvals?.map((a) => a.approverUsername).join(", ")}.`,
      });

      const updatedWires = await fetchCorporateWires();
      setCorporateWires(updatedWires || []);
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (e) {
      setWireAlert({
        type: "error",
        message: e.message || "Approval rejected.",
      });
    } finally {
      setWireApprovingId(null);
    }
  };

  const loadTelemetry = async () => {
    setTelemetryLoading(true);
    try {
      const data = await fetchTelemetryMetrics();
      setTelemetry(data);
    } catch (e) {
      console.error("Telemetry fetch failed:", e);
    } finally {
      setTelemetryLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (activeTab === "telemetry" && autoRefresh) {
      interval = setInterval(loadTelemetry, 2000);
    }
    return () => clearInterval(interval);
  }, [activeTab, autoRefresh]);

  const computeWireTier = (amountStr) => {
    const val = parseFloat(amountStr) || 0;
    if (val < 1000) {
      return {
        label: "TIER 1 (DE MINIMIS)",
        approvals: "0 Checkers (Instant Execution)",
        badge: "Under $1,000",
        color: "border-emerald-500/30 text-emerald-300 bg-emerald-500/10",
      };
    } else if (val < 10000) {
      return {
        label: "TIER 2 (SUPERVISOR CLEARANCE)",
        approvals: "1 Independent Checker Signoff",
        badge: "$1,000 to $9,999.99",
        color: "border-amber-500/30 text-amber-300 bg-amber-500/10",
      };
    } else {
      return {
        label: "TIER 3 (DUAL-CONTROL EXECUTIVE)",
        approvals: "2 Distinct Checkers Required (FINRA 3110)",
        badge: "$10,000.00 and Above",
        color: "border-rose-500/30 text-rose-300 bg-rose-500/10",
      };
    }
  };

  const currentTier = computeWireTier(wireForm.amount);

  return (
    <div className="space-y-7 pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
              Reconciliation & Corporate Spend Desk
            </h1>
          </div>
          <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
            EOD Nostro/Vostro Split-Brain Healing • FINRA Multi-Tier Maker-Checker Multi-Signature Governance
          </p>
        </div>

        {/* Persona Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0C1017] border border-white/[0.08] rounded-xl text-xs font-mono text-[#8E929B] self-start md:self-auto">
          <Building size={14} className="text-[#38BDF8] shrink-0" />
          <div>
            <span className="text-[#6E737D]">Signer Identity: </span>
            <span className="font-semibold text-white">
              {PERSONAS[activePersonaKey]?.displayName || activePersonaKey}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (FourEyes Active Pill System) */}
      <div className="inline-flex p-1 bg-[#0C1017] border border-white/[0.08] rounded-xl self-start flex-wrap">
        <button
          onClick={() => setActiveTab("recon")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
            activeTab === "recon"
              ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              : "text-[#8E929B] hover:text-white"
          }`}
        >
          <FileCheck size={14} />
          <span>EOD Statement Reconciliation</span>
        </button>
        <button
          onClick={() => setActiveTab("wires")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
            activeTab === "wires"
              ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              : "text-[#8E929B] hover:text-white"
          }`}
        >
          <UserCheck size={14} />
          <span>Maker-Checker Corporate Spend</span>
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-medium transition-all ${
            activeTab === "telemetry"
              ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              : "text-[#8E929B] hover:text-white"
          }`}
        >
          <Activity size={14} />
          <span>Ledger & SRE Telemetry</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: EOD NOSTRO/VOSTRO RECONCILIATION
          ========================================================================= */}
      {activeTab === "recon" && (
        <div className="space-y-6">
          {/* Action Trigger Card */}
          <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="font-semibold text-lg text-[#F3F1EC] tracking-[-0.02em] flex items-center gap-2">
                  <Sparkles className="text-[#38BDF8]" size={18} />
                  <span>SWIFT MT940 EOD Statement Clearing Engine</span>
                </h3>
                <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
                  Performs O(N) idempotency-keyed comparison between external bank clearing lines and internal double-entry journals.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSimulateEodStatement}
                  disabled={reconLoading}
                  className="bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold font-mono uppercase text-xs tracking-wider px-4 py-2.5 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {reconLoading ? (
                    <RefreshCw size={14} className="animate-spin text-black" />
                  ) : (
                    <Zap size={14} className="fill-black text-black" />
                  )}
                  <span>⚡ Simulate EOD SWIFT Clearing</span>
                </button>
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="bg-white/[0.04] hover:bg-white/[0.08] text-white font-mono text-xs px-3.5 py-2.5 rounded-xl border border-white/10 transition-colors"
                >
                  Custom JSON Statement
                </button>
              </div>
            </div>

            {reconAlert && (
              <div
                className={`mt-4 p-3.5 rounded-xl border text-xs font-mono flex items-start gap-2.5 animate-in fade-in ${
                  reconAlert.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {reconAlert.type === "success" ? (
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 font-medium">{reconAlert.message}</div>
                <button onClick={() => setReconAlert(null)} className="text-[#8E929B] hover:text-white">✕</button>
              </div>
            )}

            {/* Run Selection & Summary */}
            {selectedRun ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#8E929B] block">Matched Clean</span>
                    <span className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-emerald-400">
                      {selectedRun.matchedCount}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#8E929B] block">External Unmatched</span>
                    <span className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-rose-400">
                      {selectedRun.unmatchedExternalCount}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#8E929B] block">Internal Unmatched</span>
                    <span className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-amber-400">
                      {selectedRun.unmatchedInternalCount}
                    </span>
                  </div>
                  <div className="p-3.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-0.5">
                    <span className="text-[10px] font-mono uppercase text-[#8E929B] block">Amount Mismatch</span>
                    <span className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-amber-400">
                      {selectedRun.amountMismatchCount}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <h4 className="text-xs font-mono font-semibold uppercase text-[#8E929B] flex items-center gap-1.5">
                    <Scale size={14} className="text-[#38BDF8]" />
                    <span>Discrepancy Audit & Compensating Adjustment Table ({discrepancies.length} Items)</span>
                  </h4>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                      selectedRun.status === "RECONCILED_CLEAN"
                        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                        : selectedRun.status === "RESOLVED"
                        ? "bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/30"
                        : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    }`}
                  >
                    {selectedRun.status}
