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
    const personaInfo = PERSONAS[activePersona] || {
      username: activePersona || "sarah_compliance",
      role: "ROLE_COMPLIANCE_OFFICER",
      displayName: "Sarah Connor",
    };

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
    const personaInfo = PERSONAS[activePersona] || {
      username: activePersona || "sarah_compliance",
      role: "ROLE_COMPLIANCE_OFFICER",
      displayName: "Sarah Connor",
    };
    const isOfficer =
      (personaInfo.role && personaInfo.role.includes("COMPLIANCE_OFFICER")) ||
      isOfficerRole();

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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-xl">
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
              Compliance Command Center
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#7A7D82] font-mono">
            Autonomous AI AML Detective • Model Context Protocol • 4-Eyes
            HITL Approval Engine
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="w-full sm:w-72">
            <PersonaSwitcher />
          </div>

          <button
            onClick={handleSeedScenario}
            disabled={isSeeding}
            className={`px-4 py-2.5 bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold font-mono uppercase tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center gap-2 transition-all ${
              isSeeding ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            <Zap
              size={15}
              className={isSeeding ? "animate-spin" : "fill-black text-black"}
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
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-mono font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-[#8E929B] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-mono font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-rose-400" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-[#8E929B] hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#8E929B] font-medium">
            HITL Approval Queue
          </div>
          <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-amber-400 mt-1 flex items-center gap-2">
            <span>{pendingApprovals.length}</span>
            {pendingApprovals.length > 0 && (
              <span className="text-[9.5px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                Action Req
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#8E929B] font-medium">
            AI Investigations
          </div>
          <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-rose-400 mt-1 flex items-center gap-2">
            <span>{investigations.length}</span>
            <span className="text-[10px] uppercase font-mono text-[#6E737D]">
              Total
            </span>
          </div>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#8E929B] font-medium">
            Cryptographic Chain
          </div>
          <div className="mt-1 flex items-center gap-2">
            {auditData?.chainIntact ? (
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Lock size={12} />
                Intact & Verified
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-xs uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Chain Broken
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#8E929B] font-medium">
            Quarantined DLQ
          </div>
          <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-[#F3F1EC] mt-1 flex items-center gap-2">
            <span>{dlqEvents.length}</span>
            <span className="text-[10px] uppercase font-mono text-[#6E737D]">
              Events
            </span>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation (FourEyes Segmented Pill Style) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
        <button
          onClick={() => setActiveTab("investigations")}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "investigations"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] font-semibold"
              : "text-[#8E929B] hover:text-white hover:bg-white/[0.04] border border-transparent font-medium"
          }`}
        >
          <Activity size={16} />
          <span>Investigations &amp; HITL Queue ({pendingApprovals.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("policies")}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "policies"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] font-semibold"
              : "text-[#8E929B] hover:text-white hover:bg-white/[0.04] border border-transparent font-medium"
          }`}
        >
          <BookOpen size={16} />
          <span>Regulatory RAG Policies ({policies.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("sre_audit")}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "sre_audit"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] font-semibold"
              : "text-[#8E929B] hover:text-white hover:bg-white/[0.04] border border-transparent font-medium"
          }`}
        >
          <Terminal size={16} />
          <span>
            SRE DLQ &amp; Hash Audit Chain ({auditData?.totalRecords ?? 0})
          </span>
        </button>

        <button
          onClick={() => setActiveTab("webhooks")}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === "webhooks"
              ? "bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.2)] font-semibold"
              : "text-[#8E929B] hover:text-white hover:bg-white/[0.04] border border-transparent font-medium"
          }`}
        >
          <Webhook size={16} />
          <span>Webhook Gateway &amp; HMAC ({webhookDeliveries.length})</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: INVESTIGATIONS & HITL APPROVAL QUEUE
          ===================================================================== */}
      {activeTab === "investigations" && (
        <div className="space-y-8">
          {/* Pending FINRA Rule 3110 Supervisory Approval Queue */}
          {pendingApprovals.length > 0 && (
            <div className="bg-[#0C1017]/95 border border-amber-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5 relative overflow-hidden animate-in fade-in duration-300">
              {/* Top Golden Laser Accent */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold tracking-[-0.02em] text-[#F3F1EC] flex items-center gap-2.5">
                      <span>FINRA Rule 3110 4-Eyes Supervisory Control Queue</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                        {pendingApprovals.length} Pending
                      </span>
                    </h3>
                    <p className="text-xs font-mono text-[#8E929B] mt-0.5">
                      Separation of Duties Enforced: Account owners &amp; interested parties are strictly barred from self-approval.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono bg-[#06080C]/80 px-3.5 py-2 rounded-xl border border-white/[0.08]">
                  <span className="text-[#6E737D] uppercase text-[10px]">Current Reviewer:</span>
                  <span className="font-semibold text-amber-300">{PERSONAS[activePersona]?.displayName}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pendingApprovals.map((app) => {
                  const matchingInv = investigations.find((i) => i.id === app.investigationId);
                  return (
                    <div
                      key={app.id}
                      className="bg-[#06080C]/90 border border-white/[0.08] hover:border-amber-500/35 rounded-xl p-5 space-y-4 transition-all duration-300 shadow-lg relative group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-xs sm:text-sm text-amber-300">
                            Supervisory Action #{app.id}
                          </span>
                          <span className="text-xs font-mono text-[#8E929B]">
                            • Balance Hold #{app.balanceHoldId}
                          </span>
                          {matchingInv && (
                            <span className="text-xs font-mono text-[#6E737D]">
                              (Inv #{matchingInv.id} — Acc #{matchingInv.sourceAccountId} → Acc #{matchingInv.destinationAccountId})
                            </span>
                          )}
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-semibold uppercase tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          {app.proposedToolName?.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      </div>

                      <div className="text-xs font-mono bg-[#0C1017] p-3.5 rounded-xl border border-white/[0.06] space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[10px] uppercase font-semibold text-amber-400 font-mono tracking-wider">
                            Autonomous AI Detective Rationale:
                          </span>
                        </div>
                        <p className="font-sans text-xs text-[#D1D5DB] leading-relaxed pl-3.5">
                          {app.aiRationale}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono uppercase text-[#8E929B] font-semibold tracking-wider block">
                          Reviewer Audit Notes:
                        </label>
                        <input
                          type="text"
                          value={reviewerNotes}
                          onChange={(e) => setReviewerNotes(e.target.value)}
                          placeholder="Verified legitimate counterparty transaction documentation."
                          className="w-full px-3.5 py-2.5 bg-[#0C1017] border border-white/10 rounded-xl text-xs font-mono text-[#F3F1EC] placeholder-[#6E737D] focus:outline-none focus:border-[#38BDF8] transition-colors"
                        />
                      </div>

                      {/* FEATURED: Aesthetic & Animated Approval Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        {/* 1. Approve & Release Hold (Emerald Ambient Glow & Light Sheen) */}
                        <button
                          type="button"
                          onClick={() => handleApprove(app.id, "RELEASE")}
                          className="relative group overflow-hidden py-2.5 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-emerald-100 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] border border-emerald-400/40 flex items-center gap-2 cursor-pointer"
                        >
                          {/* Animated Light Sweep Sheen */}
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                          <CheckCircle2 size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
                          <span className="relative z-10 font-['Plus_Jakarta_Sans',sans-serif] tracking-normal font-semibold">
                            Approve &amp; Release Hold
                          </span>
                        </button>

                        {/* 2. Approve & Execute AML Freeze (Crimson Guard Pulse & Light Sheen) */}
                        <button
                          type="button"
                          onClick={() => handleApprove(app.id, "FREEZE")}
                          className="relative group overflow-hidden py-2.5 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-rose-100 bg-gradient-to-r from-rose-600/90 to-red-600/90 hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.55)] border border-rose-400/40 flex items-center gap-2 cursor-pointer"
                        >
                          {/* Animated Light Sweep Sheen */}
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                          <ShieldAlert size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
                          <span className="relative z-10 font-['Plus_Jakarta_Sans',sans-serif] tracking-normal font-semibold">
                            Approve &amp; Execute AML Freeze
                          </span>
                        </button>

                        {/* 3. Reject & Dismiss (Minimalist Crisp Glass) */}
                        <button
                          type="button"
                          onClick={() => handleReject(app.id)}
                          className="py-2.5 px-4 rounded-xl font-mono text-xs font-medium uppercase tracking-wider text-[#9CA3AF] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 flex items-center gap-2 cursor-pointer"
                        >
                          <XCircle size={15} />
                          <span className="font-['Plus_Jakarta_Sans',sans-serif] tracking-normal">
                            Reject &amp; Dismiss
                          </span>
                        </button>
