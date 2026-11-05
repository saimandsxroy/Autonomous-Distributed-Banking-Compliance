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
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#8E929B] font-semibold">
                Dossier Queue ({investigations.length})
              </h3>
              <button
                onClick={loadData}
                className={`text-[#6E737D] hover:text-white transition-colors ${isLoading ? "animate-spin" : ""}`}
                title="Reload"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {investigations.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-white/10 rounded-xl text-[#6E737D] text-xs font-mono">
                No active AML investigations. Click "Seed 3-Hop AML Ring Scenario"
                above to generate a fresh case.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {investigations.map((inv) => {
                  const isSelected = selectedInvestigation?.id === inv.id;
                  const isCritical = inv.riskSeverity === "CRITICAL";
                  const isAwaiting = inv.status === "AWAITING_HITL_APPROVAL";

                  return (
                    <button
                      key={inv.id}
                      onClick={() => setSelectedInvestigation(inv)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-[#0C1017] border-[#38BDF8]/60 shadow-[0_0_20px_rgba(56,189,248,0.15)] ring-1 ring-[#38BDF8]/40"
                          : "bg-[#0C1017]/70 border-white/[0.06] hover:border-white/[0.14] hover:bg-[#0C1017]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-semibold text-[#F3F1EC]">
                          Case #{inv.id} • Hold #{inv.balanceHoldId}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold uppercase tracking-wider border ${
                            isCritical
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          }`}
                        >
                          Score: {inv.riskScore}/100
                        </span>
                      </div>

                      <div className="text-xs font-medium text-[#D1D5DB] line-clamp-2 mb-2 font-sans">
                        {inv.executiveSummary}
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-[#6E737D] pt-2 border-t border-white/[0.06]">
                        <span>
                          From Acc #{inv.sourceAccountId} → #{inv.destinationAccountId}
                        </span>
                        <span
                          className={`font-semibold uppercase ${
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
                <div className="bg-[#0C1017]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg sm:text-xl font-semibold tracking-[-0.02em] text-[#F3F1EC]">
                          Investigation Case #{selectedInvestigation.id}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/10 text-[#8CB0DB] text-xs font-mono font-medium">
                          Hold #{selectedInvestigation.balanceHoldId}
                        </span>
                      </div>
                      <div className="text-xs text-[#8E929B] font-mono mt-1">
                        Source Acc #{selectedInvestigation.sourceAccountId} →
                        Dest Acc #{selectedInvestigation.destinationAccountId}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-mono text-[#6E737D] font-semibold">
                          Risk Assessment
                        </div>
                        <div className="text-2xl font-semibold font-mono text-rose-400">
                          {selectedInvestigation.riskScore}/100
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono font-semibold text-xs uppercase tracking-wider rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.15)]">
                        {selectedInvestigation.riskSeverity}
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#8E929B]">
                      Autonomous AI Detective Executive Summary
                    </div>
                    <p className="text-xs sm:text-sm text-[#D1D5DB] leading-relaxed bg-[#06080C]/80 p-4 border border-white/[0.06] rounded-xl font-sans">
                      {selectedInvestigation.executiveSummary}
                    </p>
                  </div>

                  {/* Cited Regulatory Policies */}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono text-[#6E737D] font-semibold uppercase">
                      Cited Violations:
                    </span>
                    {selectedInvestigation.citedPolicyCodes
                      ?.split(",")
                      .map((code) => (
                        <span
                          key={code}
                          className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-mono font-semibold tracking-tight"
                        >
                          {code.trim()}
                        </span>
                      ))}
                  </div>

                  {/* Phase 8: FinCEN SAR PDF Dossier Export */}
                  <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs font-mono text-[#8E929B]">
                      Official FinCEN / FATF Compliance Filing with Cryptographic Audit Seal
                    </div>
                    <button
                      onClick={() => handleDownloadSarPdf(selectedInvestigation.balanceHoldId)}
                      disabled={isDownloadingPdf}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 active:scale-95 disabled:opacity-50 text-rose-300 font-mono font-semibold text-xs uppercase tracking-wider rounded-xl border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] transition-all cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-300" />
                      <span>{isDownloadingPdf ? "Generating PDF..." : "📄 Download Official FinCEN SAR Filing (PDF)"}</span>
                    </button>
                  </div>
                </div>

                {/* Account Graph Control Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0C1017]/90 border border-white/[0.08] rounded-xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#8E929B] uppercase">
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
                          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all cursor-pointer ${
                            graphSearchAccountId === btn.id
                              ? "bg-[#38BDF8]/15 border-[#38BDF8]/50 text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)] font-semibold"
                              : "bg-[#06080C] border-white/10 text-[#8E929B] hover:text-white hover:border-white/20"
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
                      className="w-24 px-3 py-1.5 text-xs font-mono bg-[#06080C] border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#38BDF8] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => loadAccountGraph(graphSearchAccountId)}
                      className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-mono font-medium rounded-lg border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
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
                <div className="bg-[#0C1017]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                    <div className="flex items-center gap-2.5">
                      <Cpu size={18} className="text-violet-400" />
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-[#F3F1EC]">
                        Autonomous MCP Tool Execution Trail (
                        {mcpInvocations.length} Steps)
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono uppercase bg-white/[0.04] border border-white/10 text-[#8CB0DB] px-2.5 py-1 rounded-lg">
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
                          className="p-3.5 bg-[#06080C]/85 border border-white/[0.06] rounded-xl space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <span className="h-5 w-5 rounded-full bg-white/[0.06] text-[#8CB0DB] font-mono text-[10px] font-semibold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <span className="font-mono font-semibold text-xs text-[#F3F1EC]">
                                {step.toolName}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${
                                  isHitl
                                    ? "bg-rose-500/10 text-rose-300 border border-rose-500/30"
                                    : "bg-cyan-500/10 text-cyan-300 border border-cyan-500/30"
                                }`}
                              >
                                {step.permissionTier}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-semibold uppercase ${
                                  isApproved || isAuto
                                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse"
                                }`}
                              >
                                {step.executionStatus}
                              </span>
                            </div>
                          </div>

                          {/* Arguments & Output details */}
                          <div className="text-[11px] font-mono text-[#8E929B] space-y-1 bg-[#0C1017] p-2.5 rounded-lg border border-white/[0.04]">
                            <div>
                              <span className="text-[#6E737D] font-semibold uppercase text-[9px]">
                                Args:{" "}
                              </span>
                              <span className="text-[#D1D5DB] break-all">
                                {step.argumentsJson}
                              </span>
                            </div>
                            {step.outputJson && (
                              <div>
                                <span className="text-[#6E737D] font-semibold uppercase text-[9px]">
                                  Output:{" "}
                                </span>
                                <span className="text-[#D1D5DB] break-all">
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
                    <div className="bg-[#0C1017]/95 border border-amber-500/35 rounded-2xl p-6 backdrop-blur-xl shadow-2xl space-y-5 relative overflow-hidden animate-in fade-in">
                      {/* Top Golden Laser Accent */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/70 to-transparent pointer-events-none" />

                      <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                            <AlertTriangle size={18} />
                          </div>
                          <h4 className="text-sm font-semibold uppercase tracking-wider text-amber-300">
                            Human-in-the-Loop (HITL) Action Required
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-medium text-[#8E929B] bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-lg">
                          Request #{currentApproval.id}
                        </span>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-[#6E737D] font-semibold tracking-wider">
                            Proposed High-Impact Tool
                          </div>
                          <div className="text-base font-semibold font-mono text-rose-400 mt-0.5">
                            {currentApproval.proposedToolName?.replace(/([A-Z])/g, " $1").trim()}
                          </div>
                        </div>

                        <div className="p-3.5 bg-[#06080C]/85 border border-white/[0.06] rounded-xl text-xs text-[#D1D5DB] font-sans leading-relaxed">
                          <span className="font-semibold text-amber-300 font-mono text-[10px] uppercase tracking-wider block mb-1">
                            AI Detective Rationale:
                          </span>
                          {currentApproval.aiRationale}
                        </div>

                        <div>
                          <label className="text-[10px] font-mono uppercase text-[#8E929B] font-semibold tracking-wider block mb-1.5">
                            Reviewer Audit Log Notes
                          </label>
                          <textarea
                            rows={2}
                            value={reviewerNotes}
                            onChange={(e) => setReviewerNotes(e.target.value)}
                            placeholder='e.g. "Verified legitimate counterparty transaction documentation."'
                            className="w-full px-3.5 py-2.5 bg-[#06080C] border border-white/10 rounded-xl text-xs text-[#F3F1EC] placeholder-[#6E737D] focus:outline-none focus:border-[#38BDF8] font-mono transition-colors"
                          />
                        </div>

                        {/* Action buttons with FINRA Rule 3110 4-eyes enforcement (Aesthetic & Animated) */}
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(currentApproval.id, "RELEASE")}
                            className="flex-1 relative group overflow-hidden py-3 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-emerald-100 bg-gradient-to-r from-emerald-600/90 to-teal-600/90 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] border border-emerald-400/40 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                            <CheckCircle2 size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
                            <span className="relative z-10 font-['Plus_Jakarta_Sans',sans-serif] tracking-normal font-semibold">
                              Approve &amp; Release Hold
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(currentApproval.id, "FREEZE")}
                            className="flex-1 relative group overflow-hidden py-3 px-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-rose-100 bg-gradient-to-r from-rose-600/90 to-red-600/90 hover:from-rose-500 hover:to-red-500 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:shadow-[0_0_30px_rgba(244,63,94,0.55)] border border-rose-400/40 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
                            <ShieldAlert size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
                            <span className="relative z-10 font-['Plus_Jakarta_Sans',sans-serif] tracking-normal font-semibold">
                              Approve &amp; Execute AML Freeze
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReject(currentApproval.id)}
                            className="py-3 px-5 rounded-xl font-mono text-xs font-medium uppercase tracking-wider text-[#9CA3AF] hover:text-white bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all duration-200 border border-white/10 hover:border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <XCircle size={15} />
                            <span className="font-['Plus_Jakarta_Sans',sans-serif] tracking-normal">
                              Reject &amp; Dismiss
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#0C1017]/90 border border-white/[0.08] rounded-xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#8E929B] uppercase">
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
                          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg border transition-all cursor-pointer ${
                            graphSearchAccountId === btn.id
                              ? "bg-[#38BDF8]/15 border-[#38BDF8]/50 text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.2)] font-semibold"
                              : "bg-[#06080C] border-white/10 text-[#8E929B] hover:text-white hover:border-white/20"
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
                      className="w-24 px-3 py-1.5 text-xs font-mono bg-[#06080C] border border-white/10 rounded-lg text-white text-center focus:outline-none focus:border-[#38BDF8] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => loadAccountGraph(graphSearchAccountId)}
                      className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-mono font-medium rounded-lg border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7A7D82]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search regulatory mandates (e.g. structuring, smurfing, circular round-tripping, FATF layering, mule fan-out)..."
                className="w-full pl-12 pr-4 py-3 bg-[#0C1017] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl text-sm text-white focus:outline-none font-sans transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-3 bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold uppercase tracking-wider text-xs rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] transition-all shrink-0 cursor-pointer"
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
                  ? "bg-blue-500/10 text-blue-300 border-blue-500/30"
                  : jur === "FATF"
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                    : jur === "RBI"
                      ? "bg-orange-500/10 text-orange-300 border-orange-500/30"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";

              return (
                <div
                  key={p.id || p.policyCode}
                  className="p-5 bg-[#0C1017]/90 border border-white/[0.08] hover:border-white/[0.18] rounded-2xl shadow-xl flex flex-col justify-between space-y-4 backdrop-blur-xl transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${jurColor}`}
                      >
                        {p.jurisdiction}
                      </span>
                      <span className="font-mono text-[10px] text-[#6E737D]">
                        {p.policyCode}
                      </span>
                    </div>

                    <h4 className="font-semibold text-sm text-[#F3F1EC]">
                      {p.title}
                    </h4>

                    <div className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-semibold">
                      Category: {p.category}
                    </div>

                    <p className="text-xs text-[#9CA3AF] font-sans leading-relaxed line-clamp-5">
                      {p.content}
                    </p>
                  </div>

                  {p.similarityScore !== undefined && (
                    <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#8E929B]">Cosine Similarity:</span>
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
          <div className="bg-[#0C1017]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Terminal size={18} className="text-amber-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-[#F3F1EC]">
                  SRE Dead-Letter Queue (DLQ Replay)
                </h4>
              </div>
              <span className="text-xs font-mono text-[#8E929B] bg-white/[0.04] border border-white/10 px-2.5 py-1 rounded-lg">
                {dlqEvents.length} Quarantined
              </span>
            </div>

            {dlqEvents.length === 0 ? (
              <div className="p-6 text-center text-[#6E737D] text-xs font-mono">
                ✓ No quarantined DLQ events. Outbox relay pipelines operating normally.
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[#6E737D] text-[10px] uppercase tracking-wider">
                      <th className="py-2.5">ID</th>
                      <th className="py-2.5">Topic</th>
                      <th className="py-2.5">Aggregate ID</th>
                      <th className="py-2.5">Event Type</th>
                      <th className="py-2.5">Retries</th>
                      <th className="py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {dlqEvents.map((ev) => (
                      <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3 font-semibold text-[#F3F1EC]">
                          #{ev.id}
                        </td>
                        <td className="py-3 text-[#9CA3AF]">
                          {ev.originalTopic}
                        </td>
                        <td className="py-3 text-[#9CA3AF]">
                          {ev.aggregateId}
                        </td>
                        <td className="py-3 text-[#F3F1EC] font-semibold">
                          {ev.eventType}
                        </td>
                        <td className="py-3 text-rose-400 font-semibold">
                          {ev.retryCount}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleReplayDlq(ev.id)}
                            className="px-3.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono font-medium rounded-lg text-xs uppercase transition-all shadow-[0_0_10px_rgba(245,158,11,0.15)] cursor-pointer"
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
          <div className="bg-[#0C1017]/90 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3.5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <Lock size={18} className="text-emerald-400" />
                <h4 className="text-sm font-semibold uppercase tracking-wider text-[#F3F1EC]">
                  Cryptographic SHA-256 Audit Trail Chain
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {auditData?.chainIntact ? (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    Chain 100% Cryptographically Verified
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                    <AlertTriangle size={14} />
                    Chain Integrity Violation
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[#6E737D] text-[10px] uppercase tracking-wider">
                    <th className="py-2.5">ID</th>
                    <th className="py-2.5">Actor</th>
                    <th className="py-2.5">Action Type</th>
                    <th className="py-2.5">Target Entity</th>
                    <th className="py-2.5">Previous SHA-256</th>
                    <th className="py-2.5">Record SHA-256</th>
                    <th className="py-2.5 text-right">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {auditData?.auditLogs.map((log) => {
                    const isExpanded = !!expandedPayloads[log.id];

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3 font-semibold text-[#8CB0DB]">
                          #{log.id}
                        </td>
                        <td className="py-3 font-semibold text-[#F3F1EC]">
                          {log.actorUserName}
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 text-[#9CA3AF] text-[10px] font-semibold">
                            {log.actionType}
                          </span>
                        </td>
                        <td className="py-3 text-[#9CA3AF]">
                          #{log.targetEntityId}
