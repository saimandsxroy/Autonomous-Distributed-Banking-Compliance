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
