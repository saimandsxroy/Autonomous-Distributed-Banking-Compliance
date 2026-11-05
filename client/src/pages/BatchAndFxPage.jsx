import { useState, useEffect, useCallback } from "react";
import {
  Layers,
  ArrowRightLeft,
  Upload,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  Coins,
  ShieldCheck,
  TrendingUp,
  Download,
  Hash,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  fetchFxRates,
  fetchFxQuote,
  fetchSettlementBatches,
  fetchSettlementBatchById,
  uploadBatchFile,
  runSampleBatch,
  createJournalTransfer,
  fetchUserAccounts,
  getActivePersona,
  PERSONAS,
} from "../api/treasuryApi";

export function BatchAndFxPage() {
  const [activeTab, setActiveTab] = useState("batch"); // "batch" | "fx"
  const [activePersonaKey, setActivePersonaKey] = useState(getActivePersona());

  // Accounts
  const [accounts, setAccounts] = useState([]);
  const [sourceAccountId, setSourceAccountId] = useState("");

  // FX Matrix & Quote state
  const [fxRates, setFxRates] = useState([]);
  const [quoteFrom, setQuoteFrom] = useState("USD");
  const [quoteTo, setQuoteTo] = useState("INR");
  const [quoteAmount, setQuoteAmount] = useState("1000.00");
  const [liveQuote, setLiveQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [fxTransferDestination, setFxTransferDestination] = useState("15"); // Bangalore INR Vendor
  const [fxTransferSubmitting, setFxTransferSubmitting] = useState(false);
  const [fxTransferSuccess, setFxTransferSuccess] = useState(null);
  const [fxTransferError, setFxTransferError] = useState("");

  const handleQuoteToChange = (newTarget) => {
    setQuoteTo(newTarget);
    if (newTarget === "INR") setFxTransferDestination("15");
    else if (newTarget === "EUR") setFxTransferDestination("16");
    else if (newTarget === "GBP") setFxTransferDestination("17");
    else setFxTransferDestination("2");
  };

  // Batch Payout state
  const [batches, setBatches] = useState([]);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState(null);
  const [batchItemFilter, setBatchItemFilter] = useState("ALL"); // ALL, SETTLED, PENDING_HOLD, FAILED
  const [isExecutingSample, setIsExecutingSample] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sync active persona
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

  // Load user accounts
  const loadUserAccounts = useCallback(async () => {
    try {
      const accs = await fetchUserAccounts().catch(() => []);
      setAccounts(accs);
      if (accs.length > 0) {
        setSourceAccountId(accs[0].id.toString());
      }
    } catch (e) {
      console.error("Failed to load accounts:", e);
    }
  }, []);

  // Load FX Rates
  const loadRates = useCallback(async () => {
    try {
      const rates = await fetchFxRates().catch(() => []);
      setFxRates(rates);
    } catch (e) {
      console.error("Failed to load FX rates:", e);
    }
  }, []);

  // Load Batches
  const loadBatches = useCallback(async () => {
    try {
      const bList = await fetchSettlementBatches().catch(() => []);
      setBatches(bList);
      if (bList.length > 0 && !selectedBatchDetails) {
        loadBatchDetails(bList[0].id);
      }
    } catch (e) {
      console.error("Failed to load batches:", e);
    }
  }, [selectedBatchDetails]);

  const loadBatchDetails = async (id) => {
    try {
      const details = await fetchSettlementBatchById(id);
      setSelectedBatchDetails(details);
    } catch (e) {
      console.error("Failed to load batch details:", e);
    }
  };

  useEffect(() => {
    loadUserAccounts();
    loadRates();
    loadBatches();
  }, [loadUserAccounts, loadRates, loadBatches]);

  // Recalculate quote on parameters change
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!quoteAmount || isNaN(parseFloat(quoteAmount)) || parseFloat(quoteAmount) <= 0) {
        setLiveQuote(null);
        return;
      }
      setQuoteLoading(true);
      setQuoteError("");
      try {
        const q = await fetchFxQuote({
          fromCurrency: quoteFrom,
          toCurrency: quoteTo,
          amount: parseFloat(quoteAmount),
        });
        setLiveQuote(q);
      } catch (err) {
        setQuoteError(err.message || "Failed to calculate quote");
        setLiveQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [quoteFrom, quoteTo, quoteAmount]);

  const handleRunSampleBatch = async () => {
    setIsExecutingSample(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const res = await runSampleBatch();
      setUploadSuccess(
        `Batch #${res.id} (${res.batchReference}) processed concurrently with Virtual Threads: ${res.settledCount} Settled, ${res.heldAmlCount} Flagged in Escrow, ${res.failedCount} Failed.`
      );
      await loadBatches();
      await loadBatchDetails(res.id);
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (err) {
      setUploadError(err.message || "Failed to run sample batch");
    } finally {
      setIsExecutingSample(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const res = await uploadBatchFile(selectedFile, sourceAccountId);
      setUploadSuccess(`CSV file successfully uploaded and settled: Batch #${res.id} (${res.batchReference})`);
      setSelectedFile(null);
      await loadBatches();
      await loadBatchDetails(res.id);
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (err) {
      setUploadError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      "sender_account,receiver_account,amount,currency,counterparty_name,transfer_type,external_reference\n" +
      "AC-4BE19A42A8DC,AC-69D1D364271B,250.00,USD,Bob Jones,PAYROLL,EMP-001\n" +
      "AC-4BE19A42A8DC,AC-2B1F918288D9,450.00,USD,Charlie Day,VENDOR,VEN-002\n" +
      "AC-4BE19A42A8DC,AC-CORP-INR-VENDOR,1200.00,INR,Bangalore Tech,OVERSEAS_FX,FX-003\n" +
      "AC-4BE19A42A8DC,AC-69D1D364271B,15000.00,USD,Bob Jones,HIGH_VALUE_HOLD,AML-004\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "four_eyes_payroll_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteFxTransfer = async () => {
    if (!liveQuote) return;
    setFxTransferSubmitting(true);
    setFxTransferError("");
    setFxTransferSuccess(null);

    try {
      const srcId = parseInt(sourceAccountId) || 1;
      const dstId = parseInt(fxTransferDestination) || 15;
      const amt = parseFloat(quoteAmount);

      const idempotencyKey = `fx-${quoteFrom}-${quoteTo}-${Date.now()}`;
      const res = await createJournalTransfer(
        {
          sourceAccountId: srcId,
          destinationAccountId: dstId,
          amount: amt,
          currency: quoteFrom,
          targetCurrency: quoteTo,
          title: `4-Leg FX Cross-Border: ${quoteFrom} to ${quoteTo}`,
        },
        idempotencyKey
      );

      setFxTransferSuccess(res);
      await loadUserAccounts();
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (err) {
      setFxTransferError(err.message || "Failed to execute FX Transfer");
    } finally {
      setFxTransferSubmitting(false);
    }
  };

  const personaInfo = PERSONAS[activePersonaKey] || PERSONAS.alice;

  const filteredItems = (selectedBatchDetails?.items || []).filter((item) => {
    if (batchItemFilter === "ALL") return true;
    return item.outcomeStatus === batchItemFilter;
  });

  return (
    <div className="space-y-7 pb-16 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
              Bulk CSV Settlements & FX Treasury
            </h1>
          </div>
          <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
            Parallel Virtual-Thread CSV Execution • 0.50% Wire Fee Spread • 5-Leg Double-Entry Accounting
          </p>
        </div>

        {/* Persona Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0C1017] border border-white/[0.08] rounded-xl text-xs font-mono text-[#8E929B] self-start md:self-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[#6E737D]">Operator:</span>
          <span className="font-semibold text-white">{personaInfo.displayName}</span>
        </div>
      </div>

      {/* Workspace Tab Switcher (FourEyes Pill System) */}
      <div className="inline-flex p-1 bg-[#0C1017] border border-white/[0.08] rounded-xl self-start">
        <button
          onClick={() => setActiveTab("batch")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-medium rounded-lg transition-all ${
            activeTab === "batch"
              ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              : "text-[#8E929B] hover:text-white"
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Bulk CSV Payroll Batch Engine</span>
        </button>

        <button
          onClick={() => setActiveTab("fx")}
          className={`flex items-center gap-2 px-4 py-2 font-mono text-xs font-medium rounded-lg transition-all ${
            activeTab === "fx"
              ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
              : "text-[#8E929B] hover:text-white"
          }`}
        >
          <Coins size={15} />
          <span>4-Leg Multi-Currency FX Engine</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BULK CSV PAYOUT BATCH ENGINE
          ========================================================================= */}
      {activeTab === "batch" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Action Hero Bar */}
          <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[#38BDF8] font-mono font-medium text-xs uppercase tracking-wider">
                <Sparkles size={14} />
                <span>High-Throughput Corporate Payroll Engine</span>
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-[#F3F1EC]">
                1-Click 15-Row Corporate Payroll & Vendor Batch
              </h2>
              <p className="text-[#8E929B] text-xs leading-relaxed max-w-2xl font-mono">
                Concurrently executed using Java 21 Virtual Threads across a bounded Semaphore(20). Contains clean domestic transfers, cross-currency FX payouts, high-value AML holds ($15,000 threshold), and intentional overdraw tests demonstrating zero-rollback partial failure isolation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <button
                onClick={handleRunSampleBatch}
                disabled={isExecutingSample}
                className="bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold text-xs font-mono uppercase tracking-wider px-5 py-3 rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
              >
                {isExecutingSample ? (
                  <RefreshCw className="animate-spin text-black" size={16} />
                ) : (
                  <Play size={16} className="fill-black text-black" />
                )}
                <span>{isExecutingSample ? "Processing 15 Rows..." : "⚡ Run 15-Row Sample Payroll Batch"}</span>
              </button>

              <button
                onClick={handleDownloadSampleCsv}
                className="bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-mono text-xs px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Download size={14} className="text-[#8CB0DB]" />
                <span>CSV Template</span>
              </button>
            </div>
          </div>

          {/* Feedback Banners */}
          {uploadSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-emerald-300 flex items-start gap-2.5 text-xs font-mono animate-in fade-in">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 text-rose-300 flex items-start gap-2.5 text-xs font-mono animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Upload Custom File Card */}
          <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300">
            <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06] mb-5">
              <Upload size={18} className="text-[#38BDF8]" />
              <h3 className="font-semibold text-base text-[#F3F1EC]">
                Upload Custom Corporate Settlement CSV
              </h3>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                    Funding Source Treasury Account
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-[#0C1017]">
                        {acc.accountNumber} ({acc.currency}) — Available: ${Number(acc.availableBalance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                    CSV File (Auto-Computes SHA-256 Deduplication Hash)
                  </label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-[#07090D] border border-white/[0.08] rounded-xl p-2 text-xs font-mono text-[#8E929B] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-white/[0.08] file:text-white hover:file:bg-white/[0.12] cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="bg-[#F3F1EC] hover:bg-white text-black font-semibold font-mono uppercase text-xs tracking-wider px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2 disabled:opacity-50 transition-all"
                >
                  {isUploading ? <RefreshCw className="animate-spin" size={14} /> : <Upload size={14} />}
                  <span>{isUploading ? "Uploading & Settling..." : "Ingest & Execute CSV Batch"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Active / Most Recent Batch Reconciliation Dashboard */}
          {selectedBatchDetails?.batch && (
            <div className="space-y-6">
              {/* Batch Header & Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all space-y-1">
                  <div className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider flex items-center justify-between font-medium">
                    <span>Batch Reference</span>
                    <Hash size={14} className="text-[#38BDF8]" />
                  </div>
                  <div className="text-base font-semibold text-white truncate" title={selectedBatchDetails.batch.batchReference}>
                    {selectedBatchDetails.batch.batchReference}
                  </div>
                  <div className="text-[10px] text-[#6E737D] font-mono truncate" title={selectedBatchDetails.batch.fileSha256Hash}>
                    SHA-256: {selectedBatchDetails.batch.fileSha256Hash?.substring(0, 16)}...
                  </div>
                </div>

                <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all space-y-1">
                  <div className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider flex items-center justify-between font-medium">
                    <span>Settled Volume</span>
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                  <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-emerald-400">
                    ${Number(selectedBatchDetails.batch.totalSettledAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-[#6E737D] font-mono">
                    {selectedBatchDetails.batch.settledCount} of {selectedBatchDetails.batch.totalRows} settled
                  </div>
                </div>

                <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all space-y-1">
                  <div className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider flex items-center justify-between font-medium">
                    <span>AML Quarantined</span>
                    <AlertTriangle size={14} className="text-amber-400" />
                  </div>
                  <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-amber-400">
                    {selectedBatchDetails.batch.heldAmlCount || 0}
                  </div>
                  <div className="text-[10px] text-[#6E737D] font-mono">Quarantined for 4-Eyes review</div>
                </div>

                <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all space-y-1">
                  <div className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider flex items-center justify-between font-medium">
                    <span>Graceful Failures</span>
                    <XCircle size={14} className="text-rose-400" />
                  </div>
                  <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-rose-400">
                    {selectedBatchDetails.batch.failedCount || 0}
                  </div>
                  <div className="text-[10px] text-[#6E737D] font-mono">Isolated partial overdraws</div>
                </div>
              </div>

              {/* Animated Progress Bar */}
              <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl space-y-2.5">
                <div className="flex justify-between items-center text-xs font-mono text-[#8E929B]">
                  <span>Reconciliation Distribution</span>
                  <div className="flex items-center gap-2">
                    <span>Batch Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                        selectedBatchDetails.batch.status === "COMPLETED"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : selectedBatchDetails.batch.status === "COMPLETED_WITH_HOLDS"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {selectedBatchDetails.batch.status}
                    </span>
                  </div>
                </div>

                <div className="h-3 w-full bg-white/[0.03] rounded-full overflow-hidden flex border border-white/[0.06] p-0.5">
                  <div
                    style={{
                      width: `${
                        ((selectedBatchDetails.batch.settledCount || 0) /
                          (selectedBatchDetails.batch.totalRows || 1)) *
                        100
                      }%`,
                    }}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-l-full transition-all duration-700 ease-out"
                    title={`Settled: ${selectedBatchDetails.batch.settledCount}`}
                  />
                  <div
                    style={{
                      width: `${
                        ((selectedBatchDetails.batch.heldAmlCount || 0) /
                          (selectedBatchDetails.batch.totalRows || 1)) *
                        100
                      }%`,
                    }}
                    className="bg-gradient-to-r from-amber-500 to-amber-400 h-full transition-all duration-700 ease-out"
                    title={`AML Held: ${selectedBatchDetails.batch.heldAmlCount}`}
                  />
                  <div
                    style={{
                      width: `${
                        ((selectedBatchDetails.batch.failedCount || 0) /
                          (selectedBatchDetails.batch.totalRows || 1)) *
                        100
                      }%`,
                    }}
                    className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-r-full transition-all duration-700 ease-out"
                    title={`Failed: ${selectedBatchDetails.batch.failedCount}`}
                  />
                </div>
              </div>

              {/* Batch Item Details Table */}
              <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-[#38BDF8]" />
                    <h4 className="font-semibold text-sm text-[#F3F1EC]">
                      Itemized Batch Execution Journal ({filteredItems.length} rows)
                    </h4>
                  </div>

                  <div className="flex gap-1 bg-[#07090D] p-1 border border-white/[0.08] rounded-xl self-start sm:self-auto">
                    {["ALL", "SETTLED", "PENDING_HOLD", "FAILED"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setBatchItemFilter(status)}
                        className={`px-2.5 py-1 text-[10px] font-mono uppercase font-semibold rounded-lg transition-colors ${
                          batchItemFilter === status
                            ? "bg-white/[0.08] text-white"
                            : "text-[#8E929B] hover:text-white"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-white/[0.06] text-[10px] uppercase text-[#6E737D] tracking-wider">
                        <th className="py-2.5 px-3">Row</th>
                        <th className="py-2.5 px-3">Recipient</th>
                        <th className="py-2.5 px-3">Account</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Reason / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.015] transition-colors">
                          <td className="py-3 px-3 text-[#6E737D]">#{item.rowNumber}</td>
                          <td className="py-3 px-3 font-medium text-[#F3F1EC]">{item.counterpartyName}</td>
                          <td className="py-3 px-3 text-[#8E929B]">{item.receiverAccount}</td>
                          <td className="py-3 px-3 text-right font-semibold text-white">
                            ${Number(item.amount).toFixed(2)} {item.currency}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[9.5px] uppercase font-semibold border ${
                                item.outcomeStatus === "SETTLED"
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : item.outcomeStatus === "PENDING_HOLD"
                                  ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                                  : "bg-rose-500/10 text-rose-300 border-rose-500/20"
                              }`}
                            >
                              {item.outcomeStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-[#7A7D82] text-[11px] truncate max-w-xs">
                            {item.failureReason || (item.outcomeStatus === "SETTLED" ? "Zero-sum settled" : "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: 4-LEG MULTI-CURRENCY FX TREASURY ENGINE
          ========================================================================= */}
      {activeTab === "fx" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Live FX Rate Matrix (Smooth Hover Elevation) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase text-[#8E929B] font-semibold flex items-center gap-2">
                <Coins size={16} className="text-[#38BDF8]" />
                <span>Live Supported FX Rates (0.50% Spread)</span>
              </h2>
              <button
                onClick={loadRates}
                className="text-xs font-mono text-[#8E929B] hover:text-white bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={11} /> <span>Sync Rates</span>
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {fxRates.map((r) => (
                <div
                  key={r.id}
                  className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-[#38BDF8]/40 hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(56,189,248,0.12)] p-4 rounded-2xl transition-all duration-300 space-y-1 group"
                >
                  <div className="text-xs font-mono font-semibold text-[#8E929B] uppercase flex items-center justify-between">
                    <span>{r.baseCurrency} → {r.targetCurrency}</span>
                    <span className="text-[9.5px] bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 px-1 py-0.2 rounded font-mono">
                      {r.spreadBps} bps
                    </span>
                  </div>
                  <div className="font-['JetBrains_Mono',monospace] text-lg font-semibold text-[#F3F1EC] group-hover:text-white">
                    {Number(r.exchangeRate).toFixed(4)}
                  </div>
                  <div className="text-[10px] text-[#6E737D] font-mono">0.50% treasury spread</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive FX Converter & Wire Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Calculator & Wire Execution */}
            <div className="lg:col-span-7">
              <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300 space-y-5">
                <div className="flex items-center gap-2 pb-4 border-b border-white/[0.06]">
                  <ArrowRightLeft size={18} className="text-[#38BDF8]" />
                  <h3 className="font-semibold text-base text-[#F3F1EC]">
                    Multi-Currency Cross-Border Wire Execution
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                      From Currency
                    </label>
                    <select
                      value={quoteFrom}
                      onChange={(e) => setQuoteFrom(e.target.value)}
                      className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="INR">INR (Indian Rupee)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                      To Currency
                    </label>
                    <select
                      value={quoteTo}
                      onChange={(e) => handleQuoteToChange(e.target.value)}
                      className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      <option value="INR">INR (Indian Rupee)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="USD">USD (US Dollar)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                      Transfer Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={quoteAmount}
                      onChange={(e) => setQuoteAmount(e.target.value)}
                      className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2 text-xs font-mono text-white focus:outline-none"
                      placeholder="1000.00"
                    />
                  </div>
                </div>

                {/* Account Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/[0.06]">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                      Funding Source Account
                    </label>
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id} className="bg-[#0C1017]">
                          {acc.accountNumber} ({acc.currency}) — ${Number(acc.availableBalance).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-mono uppercase text-[#8E929B] font-medium">
                      Destination ({quoteTo})
                    </label>
                    <select
                      value={fxTransferDestination}
                      onChange={(e) => setFxTransferDestination(e.target.value)}
                      className="w-full bg-[#07090D] border border-white/[0.08] focus:border-[#38BDF8] rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none cursor-pointer"
                    >
                      {quoteTo === "INR" && (
                        <option value="15">Acc #15 (AC-CORP-INR-VENDOR) — Bangalore Tech (INR)</option>
                      )}
                      {quoteTo === "EUR" && (
                        <option value="16">Acc #16 (AC-CORP-EUR-VENDOR) — Frankfurt Cloud (EUR)</option>
                      )}
                      {quoteTo === "GBP" && (
                        <option value="17">Acc #17 (AC-CORP-GBP-VENDOR) — London Legal (GBP)</option>
                      )}
                      <option value="2">Acc #2 (AC-69D1D364271B) — Bob Jones (USD)</option>
                      <option value="3">Acc #3 (AC-2B1F918288D9) — Charlie Day (USD)</option>
                    </select>
                  </div>
                </div>

                {/* Feedback */}
                {fxTransferSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-emerald-300 text-xs font-mono flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-white font-semibold mb-0.5">5-Leg FX Wire Settled!</strong>
                      Journal Entry #{fxTransferSuccess.id} cleared through Nostro liquidity pools.
                    </div>
                  </div>
                )}

                {fxTransferError && (
                  <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3.5 text-rose-300 text-xs font-mono flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-400 shrink-0" />
                    <span>{fxTransferError}</span>
                  </div>
                )}

                {/* Execute Button */}
                <button
                  onClick={handleExecuteFxTransfer}
                  disabled={fxTransferSubmitting || quoteLoading || !liveQuote}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] text-black font-semibold font-mono uppercase text-xs tracking-wider rounded-xl shadow-[0_0_20px_rgba(56,189,248,0.25)] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {fxTransferSubmitting ? (
                    <RefreshCw className="animate-spin text-black" size={16} />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                  <span>
                    {fxTransferSubmitting
                      ? "Executing 5-Leg Double-Entry..."
                      : `Execute 5-Leg FX Wire (${quoteFrom} → ${quoteTo})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Right Column: Quote Breakdown & Zero-Sum Invariant Card */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-xs font-mono">
                  <span className="text-[#8E929B] font-semibold uppercase">Live FX Conversion</span>
                  {quoteLoading ? (
                    <RefreshCw size={13} className="animate-spin text-[#38BDF8]" />
                  ) : (
                    <span className="text-emerald-400 text-[10.5px]">● ACTIVE</span>
                  )}
                </div>

                {liveQuote ? (
                  <div className="space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-[#8E929B]">
                      <span>Gross Source:</span>
                      <span className="text-white font-semibold">
                        ${Number(liveQuote.sourceAmount).toFixed(2)} {liveQuote.fromCurrency}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-amber-400">
                      <span>Platform Spread Fee (0.50%):</span>
                      <span className="font-semibold">
                        -${Number(liveQuote.feeAmount).toFixed(2)} {liveQuote.fromCurrency}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[#8E929B]">
                      <span>Net Converted:</span>
                      <span className="text-white font-semibold">
                        ${Number(liveQuote.netPrincipal).toFixed(2)} {liveQuote.fromCurrency}
                      </span>
                    </div>

                    <div className="p-3.5 bg-[#07090D] border border-white/[0.06] rounded-xl space-y-1 mt-3">
                      <div className="text-[10px] uppercase font-mono text-[#8E929B]">
                        Net Destination Payout
                      </div>
                      <div className="font-['JetBrains_Mono',monospace] text-2xl font-semibold text-emerald-400">
                        {Number(liveQuote.convertedTargetAmount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="text-sm text-[#8CB0DB]">{liveQuote.toCurrency}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-[#7A7D82] font-mono text-xs">
                    Calculating conversion quote...
                  </div>
                )}
              </div>

              {/* 5-Leg Double-Entry Zero-Sum Invariant Card */}
              <div className="bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="flex items-center gap-1.5 pb-2 border-b border-white/[0.06] text-[#38BDF8] font-semibold uppercase text-[11px]">
                  <ShieldCheck size={14} />
                  <span>5-Leg Double-Entry Zero-Sum Proof</span>
                </div>

                <div className="p-2.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-1 text-[11px]">
                  <div className="text-rose-400">• Leg 1 [DEBIT]: User Account (-${liveQuote?.sourceAmount || "1,000.00"} {quoteFrom})</div>
                  <div className="text-emerald-400">• Leg 2 [CREDIT]: Fee Pool AC-SYS-FEE-USD (+${liveQuote?.feeAmount || "5.00"} {quoteFrom})</div>
                  <div className="text-emerald-400">• Leg 3 [CREDIT]: FX Pool AC-SYS-FX-{quoteFrom} (+${liveQuote?.netPrincipal || "995.00"} {quoteFrom})</div>
                  <div className="text-[#6E737D] pt-1 border-t border-white/[0.04]">∑ SignedAmount({quoteFrom}) = 0.0000 (BALANCED)</div>
                </div>

                <div className="p-2.5 bg-[#07090D] rounded-xl border border-white/[0.04] space-y-1 text-[11px]">
                  <div className="text-rose-400">• Leg 4 [DEBIT]: FX Pool AC-SYS-FX-{quoteTo} (-{liveQuote?.convertedTargetAmount || "83,082.50"} {quoteTo})</div>
                  <div className="text-emerald-400">• Leg 5 [CREDIT]: Destination Account (+{liveQuote?.convertedTargetAmount || "83,082.50"} {quoteTo})</div>
                  <div className="text-[#6E737D] pt-1 border-t border-white/[0.04]">∑ SignedAmount({quoteTo}) = 0.0000 (BALANCED)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
