import { useState, useEffect, useCallback } from "react";
import {
  fetchAmlInvestigations,
  fetchPendingApprovals,
  fetchMcpInvocations,
  fetchComplianceAuditLogs,
  seedDemoAmlScenario,
  approveHitlRequest,
  rejectHitlRequest,
  fetchAllPolicies,
  searchPolicies,
  fetchDlqEvents,
  replayDlqEvent,
  getActivePersona,
  PERSONAS,
  downloadSarPdf,
  sendTestWebhook,
  fetchWebhookDeliveries,
  fetchAccountGraph,
} from "../api/treasuryApi";
import { PersonaSwitcher } from "../components/PersonaSwitcher";
import { AmlGraphVisualizer } from "../components/AmlGraphVisualizer";
import {
  ShieldAlert,
  Zap,
  Activity,
  Terminal,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Cpu,
  FileText,
  Webhook,
} from "lucide-react";

export function ComplianceCommandCenter() {
  const [activeTab, setActiveTab] = useState("investigations");
  const [activePersona, setActivePersonaState] = useState(getActivePersona());

  // Data states
  const [investigations, setInvestigations] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [selectedInvestigation, setSelectedInvestigation] = useState(null);
  const [mcpInvocations, setMcpInvocations] = useState([]);
  const [auditData, setAuditData] = useState(null);
  const [dlqEvents, setDlqEvents] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [webhookDeliveries, setWebhookDeliveries] = useState([]);
  const [lastWebhookResult, setLastWebhookResult] = useState(null);
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [liveSubgraph, setLiveSubgraph] = useState(null);
  const [isGraphLoading, setIsGraphLoading] = useState(false);
  const [graphSearchAccountId, setGraphSearchAccountId] = useState(3);

  // Webhook customizer state (Workflow 10)
  const [webhookEventId, setWebhookEventId] = useState("evt-swift-rail-test-99");
  const [webhookEventType, setWebhookEventType] = useState("WIRE_DEPOSIT");
  const [webhookTargetAccountId, setWebhookTargetAccountId] = useState("1");
  const [webhookAmount, setWebhookAmount] = useState("5000.00");
  const [webhookCurrency, setWebhookCurrency] = useState("USD");
  const [webhookTamperSignature, setWebhookTamperSignature] = useState(false);
  const [webhookExpiredTimestamp, setWebhookExpiredTimestamp] = useState(false);

  // Loading & notification states
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [reviewerNotes, setReviewerNotes] = useState(
    "Verified legitimate counterparty transaction documentation."
  );
  const [expandedPayloads, setExpandedPayloads] = useState({});

  // Sync persona updates
  useEffect(() => {
    const handlePersonaChange = (e) => {
      const p = e.detail || getActivePersona();
      setActivePersonaState(p);
      setActionError(null);
      setActionSuccess(null);
    };
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () =>
      window.removeEventListener(
        "runestone_persona_changed",
        handlePersonaChange
      );
  }, []);

  // Main loader
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const [invs, apps, audit, dlq, pols, whs] = await Promise.all([
        fetchAmlInvestigations().catch(() => []),
        fetchPendingApprovals().catch(() => []),
        fetchComplianceAuditLogs().catch(() => null),
        fetchDlqEvents().catch(() => []),
        fetchAllPolicies().catch(() => []),
        fetchWebhookDeliveries().catch(() => []),
      ]);

      setInvestigations(invs);
      setPendingApprovals(apps);
      setAuditData(audit);
      setDlqEvents(dlq);
      setPolicies(pols);
      setWebhookDeliveries(whs);

      // Default select latest investigation if none selected
      if (invs.length > 0 && !selectedInvestigation) {
        setSelectedInvestigation(invs[invs.length - 1]);
      }
    } catch (e) {
      console.error("Failed to load compliance data", e);
    } finally {
      setIsLoading(false);
    }
  }, [selectedInvestigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load live account graph from MySQL
  const loadAccountGraph = useCallback(async (accountId) => {
    if (!accountId) return;
    setIsGraphLoading(true);
    try {
      const graph = await fetchAccountGraph(accountId);
      if (graph && !graph.error) {
        setLiveSubgraph(graph);
      }
    } catch (e) {
      console.debug("Live graph query fallback to snapshot:", e);
    } finally {
      setIsGraphLoading(false);
    }
  }, []);

  // Load MCP invocations and live subgraph when selected investigation changes
  useEffect(() => {
    if (selectedInvestigation) {
      setLiveSubgraph(null);
      const accId = selectedInvestigation.sourceAccountId || 3;
      setGraphSearchAccountId(accId);
      loadAccountGraph(accId);
      fetchMcpInvocations(selectedInvestigation.id)
        .then(setMcpInvocations)
        .catch(() => setMcpInvocations([]));
    } else {
      loadAccountGraph(3);
    }
  }, [selectedInvestigation, loadAccountGraph]);

  // Seed live AML scenario handler
  const handleSeedScenario = async () => {
    setIsSeeding(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await seedDemoAmlScenario();
      setActionSuccess(
        `⚡ Seeded 3-Hop AML Ring! Leg 1: Alice (#1) -> Bob (#2) ($120.00), Leg 2: Bob (#2) -> Charlie (#3) ($110.00), Leg 3: Charlie (#3) -> Alice (#1) ($100.00 - Closed Loop Intercepted!). Hold #${res.balanceHoldId} created. Investigation #${res.investigationId} queued for HITL review.`
      );
      await loadData();
      setGraphSearchAccountId(3);
      await loadAccountGraph(3);
      if (res.investigationId) {
        const inv = await fetchAmlInvestigations();
        const created = inv.find((i) => i.id === res.investigationId);
        if (created) setSelectedInvestigation(created);
      }
    } catch (e) {
      const msg = e.message || "Failed to seed demo scenario";
      setActionError(`Seeder failed: ${msg}`);
    } finally {
      setIsSeeding(false);
    }
  };

  // HITL Approval with FINRA Rule 3110 enforcement
  const handleApprove = async (approvalId, action = "RELEASE") => {
    setActionError(null);
    setActionSuccess(null);
    const personaInfo = PERSONAS[activePersona];

    try {
      await approveHitlRequest(
        approvalId,
        personaInfo.username,
        reviewerNotes || "Verified legitimate counterparty transaction documentation.",
        action
      );
      if (action === "RELEASE") {
        setActionSuccess(
          `✓ Request #${approvalId} APPROVED. Hold released and settled to destination account!`
        );
      } else {
        setActionSuccess(
          `✓ Request #${approvalId} APPROVED. AML freeze executed and hold reversed.`
        );
      }
      setReviewerNotes("");
      await loadData();
    } catch (e) {
      setActionError(e.message || "Approval execution failed");
    }
  };

  // HITL Rejection
  const handleReject = async (approvalId) => {
    setActionError(null);
    setActionSuccess(null);
    const personaInfo = PERSONAS[activePersona];
    const isOfficer = personaInfo.role.includes("COMPLIANCE_OFFICER");

    if (!isOfficer) {
      setActionError(
        "🚫 403 Forbidden: Only designated Compliance Officers may reject or dismiss an autonomous AML alert."
      );
      return;
    }

    try {
      await rejectHitlRequest(
        approvalId,
        personaInfo.username,
        reviewerNotes || "Rejected after manual verification"
      );
      setActionSuccess(
        `✓ Request #${approvalId} REJECTED. Balance hold dismissed.`
      );
      setReviewerNotes("");
      await loadData();
    } catch (e) {
      setActionError(`Rejection failed: ${e.message}`);
    }
  };

  // Policy search
  const handlePolicySearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      const all = await fetchAllPolicies().catch(() => []);
      setPolicies(all);
      return;
    }
    setIsLoading(true);
    try {
      const results = await searchPolicies(searchQuery, 6);
      setPolicies(results);
    } catch (e) {
      console.error("Policy search error", e);
    } finally {
      setIsLoading(false);
    }
  };

  // DLQ Replay
  const handleReplayDlq = async (id) => {
    try {
      await replayDlqEvent(id);
      setActionSuccess(
        `✓ Quarantined event #${id} successfully replayed to Kafka topic!`
      );
      const dlq = await fetchDlqEvents().catch(() => []);
      setDlqEvents(dlq);
    } catch (e) {
      setActionError(`DLQ Replay failed: ${e.message}`);
    }
  };

  // Download Official FinCEN SAR Filing (PDF)
  const handleDownloadSarPdf = async (holdId) => {
    if (!holdId) return;
    setIsDownloadingPdf(true);
    setActionError(null);
    try {
      const blob = await downloadSarPdf(holdId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `FinCEN_SAR_Hold_${holdId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setActionSuccess(`✓ Official FinCEN SAR PDF dossier successfully generated and downloaded for Hold #${holdId}`);
    } catch (err) {
      setActionError(`SAR PDF Download failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Test Webhook Gateway with Signed Payload
  const handleSendTestWebhook = async (customOptions) => {
    setIsWebhookLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const opts = customOptions || {
        tamper: webhookTamperSignature,
        expired: webhookExpiredTimestamp,
        eventId: webhookEventId,
        eventType: webhookEventType,
        targetAccountId: webhookTargetAccountId,
        amount: webhookAmount,
        currency: webhookCurrency,
      };
      const res = await sendTestWebhook(opts);
      setLastWebhookResult(res);
      const updatedDeliveries = await fetchWebhookDeliveries().catch(() => []);
      setWebhookDeliveries(updatedDeliveries);
      if (res.httpStatus === 200) {
        setActionSuccess(
          `✓ Webhook Accepted (200 OK): Event '${opts.eventId || "deposit"}' signature verified! Target account #${opts.targetAccountId || "1"} credited with $${Number(opts.amount || 5000).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${opts.currency || "USD"}. Logged as VERIFIED_AND_PROCESSED.`
        );
      } else if (res.httpStatus === 401) {
        setActionError(
          `⚠️ Webhook Rejected (401 Unauthorized): Cryptographic HMAC signature mismatch or replay drift outside 300s window. Logged as REJECTED_SIGNATURE_MISMATCH.`
        );
      } else {
        setActionError(`Webhook response HTTP ${res.httpStatus}: ${JSON.stringify(res.response)}`);
      }
    } catch (err) {
      setActionError(`Webhook test error: ${err.message}`);
    } finally {
      setIsWebhookLoading(false);
    }
  };

  // Subgraph parsing helper
  const parsedSubgraph = selectedInvestigation
    ? (() => {
        try {
          return JSON.parse(selectedInvestigation.subgraphSnapshotJson);
        } catch {
          return null;
        }
      })()
    : null;

  const currentApproval = pendingApprovals.find(
    (a) => a.investigationId === selectedInvestigation?.id
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-4 border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-950 border border-rose-800 text-rose-400 rounded-lg">
              <ShieldAlert size={26} />
            </div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">
              Compliance Command Center
            </h1>
          </div>
          <p className="text-sm md:text-base text-zinc-400 font-mono">
            Autonomous Gemini AML Detective • Model Context Protocol • 4-Eyes
            HITL Approval Engine
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="w-full sm:w-72">
            <PersonaSwitcher />
          </div>

          <button
            onClick={handleSeedScenario}
            disabled={isSeeding}
            className={`px-5 py-3.5 bg-ochre-800 hover:bg-ochre-700 active:scale-95 text-white font-black uppercase tracking-wider text-xs md:text-sm rounded-lg shadow-brutal border-2 border-ochre-600 flex items-center justify-center gap-2 transition-all ${
              isSeeding ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <Zap
              size={18}
              className={isSeeding ? "animate-spin" : "text-amber-300"}
            />
            <span>
              {isSeeding
                ? "Seeding 3-Hop Ring..."
                : "⚡ Seed 3-Hop AML Ring Scenario"}
            </span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-950/70 border-2 border-emerald-600 rounded-lg text-emerald-300 text-sm font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-emerald-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-rose-950/80 border-2 border-rose-600 rounded-lg text-rose-200 text-sm font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} className="shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900 border-2 border-zinc-800 rounded-lg shadow-brutal">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            HITL Approval Queue
          </div>
          <div className="text-3xl font-black text-amber-400 mt-1 flex items-center gap-2">
            <span>{pendingApprovals.length}</span>
            {pendingApprovals.length > 0 && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-950 border border-amber-700 text-amber-300">
                Action Req
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-2 border-zinc-800 rounded-lg shadow-brutal">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            AI Investigations
          </div>
          <div className="text-3xl font-black text-rose-400 mt-1 flex items-center gap-2">
            <span>{investigations.length}</span>
            <span className="text-[10px] uppercase font-mono text-zinc-500">
              Total
            </span>
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-2 border-zinc-800 rounded-lg shadow-brutal">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Cryptographic Chain
          </div>
          <div className="mt-1 flex items-center gap-2">
            {auditData?.chainIntact ? (
              <span className="px-2.5 py-1 rounded bg-emerald-950/80 border border-emerald-600 text-emerald-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} />
                Intact & Verified
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-rose-950/80 border border-rose-600 text-rose-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Chain Broken
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-900 border-2 border-zinc-800 rounded-lg shadow-brutal">
          <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
            Quarantined DLQ
          </div>
          <div className="text-3xl font-black text-zinc-200 mt-1 flex items-center gap-2">
            <span>{dlqEvents.length}</span>
            <span className="text-[10px] uppercase font-mono text-zinc-500">
              Events
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b-2 border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab("investigations")}
          className={`pb-4 px-2 font-bold uppercase tracking-wider text-sm flex items-center gap-2 border-b-4 transition-all ${
            activeTab === "investigations"
              ? "border-ochre-800 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Activity size={18} />
          <span>Investigations & HITL Queue ({pendingApprovals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`pb-4 px-2 font-bold uppercase tracking-wider text-sm flex items-center gap-2 border-b-4 transition-all ${
            activeTab === "policies"
              ? "border-ochre-800 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <BookOpen size={18} />
          <span>Regulatory RAG Policies ({policies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sre_audit")}
          className={`pb-4 px-2 font-bold uppercase tracking-wider text-sm flex items-center gap-2 border-b-4 transition-all ${
            activeTab === "sre_audit"
              ? "border-ochre-800 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Terminal size={18} />
          <span>
            SRE DLQ & Hash Audit Chain ({auditData?.totalRecords ?? 0})
          </span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`pb-4 px-2 font-bold uppercase tracking-wider text-sm flex items-center gap-2 border-b-4 transition-all ${
            activeTab === "webhooks"
              ? "border-ochre-800 text-white"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Webhook size={18} />
          <span>Webhook Gateway & HMAC ({webhookDeliveries.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: INVESTIGATIONS & HITL APPROVAL QUEUE
          ===================================================================== */}
      {activeTab === "investigations" && (
        <div className="space-y-8">
          {/* Pending FINRA Rule 3110 Supervisory Approval Queue */}
          {pendingApprovals.length > 0 && (
            <div className="bg-zinc-900 border-4 border-amber-500/80 rounded-2xl p-6 shadow-brutal space-y-5 animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-950/80 border-2 border-amber-600 rounded-xl text-amber-400">
                    <ShieldAlert size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                      <span>FINRA Rule 3110 4-Eyes Supervisory Control Queue</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500 text-zinc-950">
                        {pendingApprovals.length} Pending
                      </span>
                    </h3>
                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                      Separation of Duties Enforced: Account owners &amp; interested parties are strictly barred from self-approval.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 uppercase">Current Reviewer:</span>
                  <span className="font-bold text-yellow-400">{PERSONAS[activePersona]?.displayName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pendingApprovals.map((app) => {
                  const matchingInv = investigations.find((i) => i.id === app.investigationId);
                  return (
                    <div
                      key={app.id}
                      className="bg-zinc-950 border-2 border-amber-900/60 rounded-xl p-5 space-y-4 hover:border-amber-700/80 transition-all shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-amber-300">
                            Supervisory Action #{app.id}
                          </span>
                          <span className="text-xs font-mono text-zinc-400">
                            • Balance Hold #{app.balanceHoldId}
                          </span>
                          {matchingInv && (
                            <span className="text-xs font-mono text-zinc-500">
                              (Investigation #{matchingInv.id} — From Acc #{matchingInv.sourceAccountId} → Acc #{matchingInv.destinationAccountId})
                            </span>
                          )}
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-950 text-rose-300 border border-rose-800">
                          {app.proposedToolName}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-zinc-300 bg-zinc-900/70 p-3 rounded-lg border border-zinc-800 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">AI Detective Rationale:</span>
                        <p className="font-sans text-xs text-zinc-200">{app.aiRationale}</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block">
                          Reviewer Audit Notes:
                        </label>
                        <input
                          type="text"
                          value={reviewerNotes}
                          onChange={(e) => setReviewerNotes(e.target.value)}
                          placeholder="Verified legitimate counterparty transaction documentation."
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-ochre-800"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(app.id, "RELEASE")}
                          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-brutal flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <CheckCircle2 size={16} />
                          <span>Approve &amp; Release Hold</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(app.id, "FREEZE")}
                          className="py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-brutal flex items-center gap-1.5 transition-all active:scale-95"
                        >
                          <ShieldAlert size={16} />
                          <span>Approve &amp; Execute AML Freeze</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(app.id)}
                          className="py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-xs rounded-lg border border-zinc-700 flex items-center gap-1.5 transition-all"
                        >
                          <XCircle size={16} />
                          <span>Reject &amp; Dismiss</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Investigations List */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
                Dossier Queue ({investigations.length})
              </h3>
              <button
                onClick={loadData}
                className={`text-zinc-500 hover:text-white ${isLoading ? "animate-spin" : ""}`}
                title="Reload"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {investigations.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-zinc-800 rounded-lg text-zinc-500 text-xs">
                No active AML investigations. Click "Seed Live AML Scenario"
                above to generate a fresh case.
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {investigations.map((inv) => {
                  const isSelected = selectedInvestigation?.id === inv.id;
                  const isCritical = inv.riskSeverity === "CRITICAL";
                  const isAwaiting = inv.status === "AWAITING_HITL_APPROVAL";

                  return (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvestigation(inv)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all shadow-sm ${
                        isSelected
                          ? "bg-zinc-900 border-ochre-800 shadow-brutal"
                          : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-zinc-300">
                          Case #{inv.id} • Hold #{inv.balanceHoldId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isCritical
                              ? "bg-rose-950 text-rose-300 border-rose-700"
                              : "bg-amber-950 text-amber-300 border-amber-700"
                          }`}
                        >
                          Score: {inv.riskScore}/100
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-zinc-200 line-clamp-2 mb-2">
                        {inv.executiveSummary}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-2 border-t border-zinc-800">
                        <span>
                          From Acc #{inv.sourceAccountId} → #
                          {inv.destinationAccountId}
                        </span>
                        <span
                          className={`font-bold uppercase ${
                            isAwaiting ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {isAwaiting ? "Awaiting HITL" : "Resolved"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Selected Case Details */}
          <div className="lg:col-span-8 space-y-6">
            {selectedInvestigation ? (
              <div className="space-y-6">
                {/* Case Header Card */}
                <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-white">
                          Investigation Case #{selectedInvestigation.id}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-bold">
                          Hold ID #{selectedInvestigation.balanceHoldId}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 font-mono mt-1">
                        Source Acc #{selectedInvestigation.sourceAccountId} →
                        Dest Acc #{selectedInvestigation.destinationAccountId}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold">
                          Risk Assessment
                        </div>
                        <div className="text-2xl font-black text-rose-500">
                          {selectedInvestigation.riskScore}/100
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-rose-950 border border-rose-700 text-rose-300 font-black text-xs uppercase tracking-wider rounded-md">
                        {selectedInvestigation.riskSeverity}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      Gemini AML Detective Executive Summary
                    </div>
                    <p className="text-sm text-zinc-200 leading-relaxed bg-zinc-950 p-4 border border-zinc-800 rounded-lg font-sans">
                      {selectedInvestigation.executiveSummary}
                    </p>
                  </div>

                  {/* Cited Regulatory Policies */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-mono text-zinc-500 font-bold uppercase">
                      Cited Violations:
                    </span>
                    {selectedInvestigation.citedPolicyCodes
                      ?.split(",")
                      .map((code) => (
                        <span
                          key={code}
                          className="px-2.5 py-1 bg-rose-950/60 border border-rose-800 text-rose-300 rounded text-xs font-mono font-bold tracking-tight"
                        >
                          {code.trim()}
                        </span>
                      ))}
                  </div>

                  {/* Phase 8: FinCEN SAR PDF Dossier Export */}
                  <div className="mt-5 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-mono text-zinc-400">
                      Official FinCEN / FATF Compliance Filing with Cryptographic Audit Seal
                    </div>
                    <button
                      onClick={() => handleDownloadSarPdf(selectedInvestigation.balanceHoldId)}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-900/80 hover:bg-rose-850 active:scale-95 disabled:opacity-50 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg border-2 border-rose-600 shadow-brutal transition-all"
                    >
                      <FileText className="w-4 h-4 text-rose-300" />
                      <span>{isDownloadingPdf ? "Generating PDF..." : "📄 Download Official FinCEN SAR Filing (PDF)"}</span>
                    </button>
                  </div>
                </div>

                {/* Account Graph Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-brutal">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                      Inspect Account:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 3, label: "Account #3 (Charlie)" },
                        { id: 1, label: "Account #1 (Alice)" },
                        { id: 2, label: "Account #2 (Bob)" },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            setGraphSearchAccountId(btn.id);
                            loadAccountGraph(btn.id);
                          }}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition-all ${
                            graphSearchAccountId === btn.id
                              ? "bg-ochre-800 border-ochre-600 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={graphSearchAccountId}
                      onChange={(e) => setGraphSearchAccountId(Number(e.target.value))}
                      placeholder="Account ID"
                      className="w-24 px-2.5 py-1 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded text-white text-center focus:outline-none focus:border-ochre-700"
                    />
                    <button
                      type="button"
                      onClick={() => loadAccountGraph(graphSearchAccountId)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded border border-zinc-600 flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={12} className={isGraphLoading ? "animate-spin" : ""} />
                      <span>Traverse Graph</span>
                    </button>
                  </div>
                </div>

                {/* 5-Hop Recursive CTE Graph Visualizer */}
                <AmlGraphVisualizer
                  analysis={liveSubgraph || parsedSubgraph}
                  loading={isGraphLoading}
                  onRefresh={() => loadAccountGraph(graphSearchAccountId || selectedInvestigation?.sourceAccountId || 3)}
                  title={`Sub-Graph Analysis: Account #${graphSearchAccountId || selectedInvestigation?.sourceAccountId || 3} Money Trail`}
                />

                {/* MCP Tool Execution Trail (Step-by-Step) */}
                <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Cpu size={18} className="text-violet-400" />
                      <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                        Autonomous MCP Tool Execution Trail (
                        {mcpInvocations.length} Steps)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      Model Context Protocol 2.0
                    </span>
                  </div>

                  <div className="space-y-3">
                    {mcpInvocations.map((step, idx) => {
                      const isHitl = step.permissionTier === "WRITE_HITL";
                      const isApproved =
                        step.executionStatus === "HITL_APPROVED_EXECUTED";
                      const isAuto = step.executionStatus === "AUTO_EXECUTED";

                      return (
                        <div
                          key={step.id || idx}
                          className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="h-5 w-5 rounded-full bg-zinc-800 text-zinc-300 font-mono text-[10px] font-black flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-mono font-bold text-xs text-zinc-100">
                                {step.toolName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                  isHitl
                                    ? "bg-rose-950 text-rose-300 border border-rose-800"
                                    : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                }`}
                              >
                                {step.permissionTier}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  isApproved || isAuto
                                    ? "bg-emerald-950 text-emerald-300"
                                    : "bg-amber-950 text-amber-300 animate-pulse"
                                }`}
                              >
                                {step.executionStatus}
                              </span>
                            </div>
                          </div>

                          {/* Arguments & Output details */}
                          <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-900/60 p-2.5 rounded border border-zinc-800/80">
                            <div>
                              <span className="text-zinc-500 font-bold uppercase text-[9px]">
                                Args:{" "}
                              </span>
                              <span className="text-zinc-300 break-all">
                                {step.argumentsJson}
                              </span>
                            </div>
                            {step.outputJson && (
                              <div>
                                <span className="text-zinc-500 font-bold uppercase text-[9px]">
                                  Output:{" "}
                                </span>
                                <span className="text-zinc-300 break-all">
                                  {step.outputJson.length > 220
                                    ? step.outputJson.substring(0, 220) + "..."
                                    : step.outputJson}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* HITL Approval Decision Action Card */}
                {currentApproval &&
                  currentApproval.status === "PENDING_APPROVAL" && (
                    <div className="bg-zinc-900 border-4 border-amber-600/80 rounded-xl p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle size={20} className="text-amber-400" />
                          <h4 className="text-base font-black uppercase tracking-wider text-amber-300">
                            Human-in-the-Loop (HITL) Action Required
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-zinc-400">
                          Request ID #{currentApproval.id}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="text-[11px] font-mono uppercase text-zinc-500 font-bold">
                            Proposed High-Impact Tool
                          </div>
                          <div className="text-lg font-black font-mono text-rose-400">
                            {currentApproval.proposedToolName}
                          </div>
                        </div>

                        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-sans leading-relaxed">
                          <span className="font-bold text-amber-300 block mb-1">
                            AI Rationale:
                          </span>
                          {currentApproval.aiRationale}
                        </div>

                        <div>
                          <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                            Reviewer Audit Log Notes
                          </label>
                          <textarea
                            rows={2}
                            value={reviewerNotes}
                            onChange={(e) => setReviewerNotes(e.target.value)}
                            placeholder='e.g. "Verified legitimate counterparty transaction documentation."'
                            className="w-full px-3.5 py-2.5 bg-zinc-950 border-2 border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-ochre-800 font-mono"
                          />
                        </div>

                        {/* Action buttons with FINRA Rule 3110 4-eyes enforcement */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            onClick={() => handleApprove(currentApproval.id, "RELEASE")}
                            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-brutal flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <CheckCircle2 size={16} />
                            <span>Approve & Release Hold</span>
                          </button>

                          <button
                            onClick={() => handleApprove(currentApproval.id, "FREEZE")}
                            className="py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider text-xs rounded-lg shadow-brutal flex items-center justify-center gap-2 transition-all active:scale-95"
                          >
                            <ShieldAlert size={16} />
                            <span>Approve & Execute AML Freeze</span>
                          </button>

                          <button
                            onClick={() => handleReject(currentApproval.id)}
                            className="py-3 px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase tracking-wider text-xs rounded-lg border-2 border-zinc-700 flex items-center justify-center gap-2 transition-all"
                          >
                            <XCircle size={16} />
                            <span>Reject & Dismiss</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-brutal">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-zinc-400 uppercase">
                      Inspect Account:
                    </span>
                    <div className="flex items-center gap-1.5">
                      {[
                        { id: 3, label: "Account #3 (Charlie)" },
                        { id: 1, label: "Account #1 (Alice)" },
                        { id: 2, label: "Account #2 (Bob)" },
                      ].map((btn) => (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => {
                            setGraphSearchAccountId(btn.id);
                            loadAccountGraph(btn.id);
                          }}
                          className={`px-2.5 py-1 text-xs font-mono font-bold rounded border transition-all ${
                            graphSearchAccountId === btn.id
                              ? "bg-ochre-800 border-ochre-600 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={graphSearchAccountId}
                      onChange={(e) => setGraphSearchAccountId(Number(e.target.value))}
                      placeholder="Account ID"
                      className="w-24 px-2.5 py-1 text-xs font-mono bg-zinc-950 border border-zinc-700 rounded text-white text-center focus:outline-none focus:border-ochre-700"
                    />
                    <button
                      type="button"
                      onClick={() => loadAccountGraph(graphSearchAccountId)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-bold rounded border border-zinc-600 flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw size={12} className={isGraphLoading ? "animate-spin" : ""} />
                      <span>Traverse Graph</span>
                    </button>
                  </div>
                </div>

                <AmlGraphVisualizer
                  analysis={liveSubgraph}
                  loading={isGraphLoading}
                  onRefresh={() => loadAccountGraph(graphSearchAccountId || 3)}
                  title={`Sub-Graph Analysis: Account #${graphSearchAccountId || 3} Money Trail`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* =====================================================================
          TAB 2: REGULATORY RAG POLICY EXPLORER
          ===================================================================== */}
      {activeTab === "policies" && (
        <div className="space-y-6">
          {/* Search bar */}
          <form onSubmit={handlePolicySearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search regulatory mandates (e.g. structuring, smurfing, circular round-tripping, FATF layering, mule fan-out)..."
                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border-2 border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-ochre-800 font-sans"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-ochre-800 hover:bg-ochre-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg shadow-brutal"
            >
              Semantic RAG Search
            </button>
          </form>

          {/* Policy cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {policies.map((p) => {
              const jur = p.jurisdiction;
              const jurColor =
                jur === "FINCEN"
                  ? "bg-blue-950 text-blue-300 border-blue-700"
                  : jur === "FATF"
                    ? "bg-purple-950 text-purple-300 border-purple-700"
                    : jur === "RBI"
                      ? "bg-orange-950 text-orange-300 border-orange-700"
                      : "bg-emerald-950 text-emerald-300 border-emerald-700";

              return (
                <div
                  key={p.id || p.policyCode}
                  className="p-5 bg-zinc-900 border-2 border-zinc-800 rounded-xl shadow-brutal flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${jurColor}`}
                      >
                        {p.jurisdiction}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-500">
                        {p.policyCode}
                      </span>
                    </div>

                    <h4 className="font-bold text-sm text-zinc-100">
                      {p.title}
                    </h4>

                    <div className="text-[10px] font-mono uppercase tracking-wider text-ochre-600 font-bold">
                      Category: {p.category}
                    </div>

                    <p className="text-xs text-zinc-400 font-sans leading-relaxed line-clamp-5">
                      {p.content}
                    </p>
                  </div>

                  {p.similarityScore !== undefined && (
                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-500">Cosine Similarity:</span>
                      <span className="font-bold text-emerald-400">
                        {(p.similarityScore * 100).toFixed(1)}% Match
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: SRE DLQ & CRYPTOGRAPHIC HASH AUDIT TRAIL
          ===================================================================== */}
      {activeTab === "sre_audit" && (
        <div className="space-y-8">
          {/* Dead Letter Queue (DLQ) Card */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-amber-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  SRE Dead-Letter Queue (DLQ Replay)
                </h4>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {dlqEvents.length} Quarantined
              </span>
            </div>

            {dlqEvents.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs font-mono">
                ✓ No quarantined DLQ events. Outbox relay pipelines operating
                normally.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-wider">
                      <th className="py-2">ID</th>
                      <th className="py-2">Topic</th>
                      <th className="py-2">Aggregate ID</th>
                      <th className="py-2">Event Type</th>
                      <th className="py-2">Retries</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {dlqEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-zinc-950/50">
                        <td className="py-2.5 font-bold text-zinc-300">
                          #{ev.id}
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          {ev.originalTopic}
                        </td>
                        <td className="py-2.5 text-zinc-400">
                          {ev.aggregateId}
                        </td>
                        <td className="py-2.5 text-zinc-300 font-bold">
                          {ev.eventType}
                        </td>
                        <td className="py-2.5 text-rose-400 font-bold">
                          {ev.retryCount}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleReplayDlq(ev.id)}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[10px] uppercase shadow-sm"
                          >
                            Replay to Kafka
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cryptographic SHA-256 Hash Chain Explorer */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Lock size={18} className="text-emerald-400" />
                <h4 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                  Cryptographic SHA-256 Audit Trail Chain
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {auditData?.chainIntact ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-950 border border-emerald-600 text-emerald-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Chain 100% Cryptographically Verified
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-rose-950 border border-rose-600 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle size={14} />
                    Chain Integrity Violation
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 text-[10px] uppercase tracking-wider">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Actor</th>
                    <th className="py-2.5">Action Type</th>
                    <th className="py-2.5">Target Entity</th>
                    <th className="py-2.5">Previous SHA-256</th>
                    <th className="py-2.5">Record SHA-256</th>
                    <th className="py-2.5 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {auditData?.auditLogs.map((log) => {
                    const isExpanded = !!expandedPayloads[log.id];

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-zinc-950/60 transition-colors"
                      >
                        <td className="py-3 font-bold text-zinc-400">
                          #{log.id}
                        </td>
                        <td className="py-3 font-semibold text-zinc-200">
                          {log.actorUserName}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-3 text-zinc-400">
                          #{log.targetEntityId}
                        </td>
                        <td
                          className="py-3 text-zinc-500 text-[10px] truncate max-w-[120px]"
                          title={log.previousHash}
                        >
                          {log.previousHash === "GENESIS"
                            ? "GENESIS"
                            : log.previousHash.substring(0, 10) + "..."}
                        </td>
                        <td
                          className="py-3 text-emerald-400 text-[10px] truncate max-w-[120px]"
                          title={log.recordHash}
                        >
                          {log.recordHash.substring(0, 10)}...
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() =>
                              setExpandedPayloads((prev) => ({
                                ...prev,
                                [log.id]: !prev[log.id],
                              }))
                            }
                            className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-bold"
                          >
                            {isExpanded ? "Hide" : "Inspect"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Payload Viewer */}
            {Object.keys(expandedPayloads).some(
              (k) => expandedPayloads[Number(k)]
            ) && (
              <div className="mt-4 p-4 bg-zinc-950 border border-zinc-800 rounded-lg">
                <div className="text-[10px] uppercase font-mono text-zinc-500 font-bold mb-2">
                  Payload Inspection:
                </div>
                {auditData?.auditLogs
                  .filter((l) => expandedPayloads[l.id])
                  .map((l) => (
                    <pre
                      key={`inspect-${l.id}`}
                      className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all"
                    >
                      [ID #{l.id} - {l.actionType}]{l.payload}
                    </pre>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: CRYPTOGRAPHIC WEBHOOK GATEWAY & HMAC-SHA256 TESTER
          ===================================================================== */}
      {activeTab === "webhooks" && (
        <div className="space-y-6">
          {/* Header & Gateway Security Overview */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Webhook className="w-5 h-5 text-yellow-400" />
                  <span>Cryptographic HMAC-SHA256 Webhook Gateway</span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-1">
                  External payment rail ingress & egress with constant-time verification & 300s replay drift prevention
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                  Replay Window: <strong className="text-yellow-400">300s</strong>
                </span>
                <span className="px-3 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-300">
                  Algorithm: <strong className="text-yellow-400">HMAC-SHA256</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg space-y-2">
                <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
                  Active Webhook Secret Key
                </div>
                <div className="font-mono text-xs text-yellow-400 bg-zinc-900 px-3 py-2 rounded border border-zinc-800 break-all select-all">
                  whsec_runestone_swift_rail_2024_prod
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Managed via <code className="text-zinc-400">config_treasury_app</code> table and dynamic AppCache.
                </div>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-lg space-y-2">
                <div className="text-[11px] font-mono uppercase font-bold text-zinc-400">
                  HMAC Signature Formula
                </div>
                <div className="font-mono text-xs text-green-400 bg-zinc-900 px-3 py-2 rounded border border-zinc-800 break-all">
                  Hex(Mac(&quot;HmacSHA256&quot;, X-RuneStone-Timestamp + &quot;.&quot; + rawPayload, secret))
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Compared using <code className="text-zinc-400">MessageDigest.isEqual</code> to eliminate timing side-channels.
                </div>
              </div>
            </div>
          </div>

          {/* Interactive HMAC Simulator Card */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800">
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>Inbound SWIFT Rail Webhook Dispatcher</span>
                </h4>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Configure custom event payload parameters or trigger standard test vectors against <code className="text-zinc-400">POST /webhooks/inbound/swift-rail</code>
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setWebhookEventId("evt-swift-rail-test-99");
                    setWebhookEventType("WIRE_DEPOSIT");
                    setWebhookTargetAccountId("1");
                    setWebhookAmount("5000.00");
                    setWebhookCurrency("USD");
                    setWebhookTamperSignature(false);
                    setWebhookExpiredTimestamp(false);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-emerald-800 hover:border-emerald-600 rounded text-[11px] font-mono text-emerald-300 font-bold transition-colors"
                >
                  ⚡ Preset 1 (Valid 200)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setWebhookEventId("evt-tamper-test-101");
                    setWebhookEventType("WIRE_DEPOSIT");
                    setWebhookTargetAccountId("1");
                    setWebhookAmount("5000.00");
                    setWebhookCurrency("USD");
                    setWebhookTamperSignature(true);
                    setWebhookExpiredTimestamp(false);
                  }}
                  className="px-2.5 py-1.5 bg-zinc-950 border border-rose-800 hover:border-rose-600 rounded text-[11px] font-mono text-rose-300 font-bold transition-colors"
                >
                  ⚡ Preset 2 (Tampered 401)
                </button>
              </div>
            </div>

            {/* Configurable Test Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Event ID
                </label>
                <input
                  type="text"
                  value={webhookEventId}
                  onChange={(e) => setWebhookEventId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  placeholder="evt-swift-rail-test-99"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Event Type
                </label>
                <select
                  value={webhookEventType}
                  onChange={(e) => setWebhookEventType(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="WIRE_DEPOSIT">WIRE_DEPOSIT</option>
                  <option value="ACH_CREDIT">ACH_CREDIT</option>
                  <option value="SETTLEMENT_PAYOUT">SETTLEMENT_PAYOUT</option>
                  <option value="FX_INTERBANK_SETTLE">FX_INTERBANK_SETTLE</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Target Account ID
                </label>
                <input
                  type="text"
                  value={webhookTargetAccountId}
                  onChange={(e) => setWebhookTargetAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  placeholder="1 or AC-4BE19A42A8DC"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={webhookAmount}
                  onChange={(e) => setWebhookAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                  placeholder="5000.00"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase font-bold text-zinc-400 block mb-1">
                  Currency
                </label>
                <select
                  value={webhookCurrency}
                  onChange={(e) => setWebhookCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white focus:outline-none focus:border-yellow-400"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex flex-col justify-end space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={webhookTamperSignature}
                    onChange={(e) => setWebhookTamperSignature(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={`text-xs font-mono font-bold ${webhookTamperSignature ? "text-rose-400" : "text-zinc-400"}`}>
                    Tamper Signature (Test HTTP 401)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={webhookExpiredTimestamp}
                    onChange={(e) => setWebhookExpiredTimestamp(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-950 border-zinc-700 text-amber-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={`text-xs font-mono font-bold ${webhookExpiredTimestamp ? "text-amber-400" : "text-zinc-400"}`}>
                    Expired Timestamp (&gt; 300s Replay)
                  </span>
                </label>
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => handleSendTestWebhook()}
                disabled={isWebhookLoading}
                className={`w-full py-3.5 px-6 font-black uppercase tracking-wider text-xs md:text-sm rounded-xl border-2 transition-all shadow-brutal flex items-center justify-center gap-2 ${
                  webhookTamperSignature
                    ? "bg-rose-950 hover:bg-rose-900 border-rose-700 text-rose-200"
                    : "bg-emerald-950 hover:bg-emerald-900 border-emerald-600 text-emerald-200"
                } ${isWebhookLoading ? "opacity-60 cursor-not-allowed" : "active:scale-98"}`}
              >
                {isWebhookLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : webhookTamperSignature ? (
                  <XCircle size={16} className="text-rose-400" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-400" />
                )}
                <span>
                  {isWebhookLoading
                    ? "Cryptographically Verifying..."
                    : `Send Signed Inbound Webhook (${webhookTamperSignature ? "Tampered Mode" : "Valid Mode"})`}
                </span>
              </button>
            </div>

            {/* Simulation Response Inspection */}
            {lastWebhookResult && (
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold text-zinc-500">
                      Gateway Response
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-black ${
                        lastWebhookResult.httpStatus === 200
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-600"
                          : "bg-rose-950 text-rose-400 border border-rose-600"
                      }`}
                    >
                      HTTP {lastWebhookResult.httpStatus}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Event ID: {lastWebhookResult.signedPayload?.eventId}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 block mb-1">Signed Headers:</span>
                    <pre className="bg-zinc-900 p-2.5 rounded border border-zinc-800 text-zinc-300 text-[11px] whitespace-pre-wrap break-all">
                      {`X-RuneStone-Timestamp: ${lastWebhookResult.signedPayload?.timestamp}\nX-RuneStone-Signature: ${lastWebhookResult.signedPayload?.signature}`}
                    </pre>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-1">Server Response Body:</span>
                    <pre className="bg-zinc-900 p-2.5 rounded border border-zinc-800 text-zinc-300 text-[11px] whitespace-pre-wrap break-all">
                      {JSON.stringify(lastWebhookResult.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Webhook Deliveries Log Table */}
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-xl p-6 shadow-brutal space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-yellow-400" />
                <h4 className="text-sm font-black uppercase tracking-wider text-zinc-200">
                  Webhook Deliveries Ledger ({webhookDeliveries.length})
                </h4>
              </div>
              <button
                onClick={async () => {
                  const whs = await fetchWebhookDeliveries().catch(() => []);
                  setWebhookDeliveries(whs);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono font-bold transition-colors"
              >
                <RefreshCw size={12} />
                <span>Refresh Log</span>
              </button>
            </div>

            {webhookDeliveries.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 font-mono text-sm">
                No webhook deliveries recorded yet. Use the simulator buttons above to generate signed events.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px]">
                      <th className="pb-3 pr-4 font-bold">ID</th>
                      <th className="pb-3 px-4 font-bold">Direction</th>
                      <th className="pb-3 px-4 font-bold">Event ID</th>
                      <th className="pb-3 px-4 font-bold">Event Type</th>
                      <th className="pb-3 px-4 font-bold">Target / Rail</th>
                      <th className="pb-3 px-4 font-bold">Verification Status</th>
                      <th className="pb-3 pl-4 font-bold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {webhookDeliveries.map((d) => (
                      <tr key={d.id} className="hover:bg-zinc-850/40">
                        <td className="py-3 pr-4 text-zinc-400 font-bold">#{d.id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.direction === "INBOUND"
                                ? "bg-cyan-950 text-cyan-300 border border-cyan-800"
                                : "bg-purple-950 text-purple-300 border border-purple-800"
                            }`}
                          >
                            {d.direction}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-mono max-w-[140px] truncate">
                          {d.eventId}
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-bold">{d.eventType}</td>
                        <td className="py-3 px-4 text-zinc-400">{d.targetOrSource}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              d.verificationOrHttpStatus === "VERIFIED_OK"
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                : d.verificationOrHttpStatus === "SIGNATURE_INVALID"
                                ? "bg-rose-950 text-rose-300 border border-rose-800"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {d.verificationOrHttpStatus}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-zinc-500 whitespace-nowrap">
                          {d.createdAt ? new Date(d.createdAt).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

