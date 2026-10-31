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
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
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
  const [fxTransferDestination, setFxTransferDestination] = useState("3"); // Charlie or vendor
  const [fxTransferSubmitting, setFxTransferSubmitting] = useState(false);
  const [fxTransferSuccess, setFxTransferSuccess] = useState(null);
  const [fxTransferError, setFxTransferError] = useState("");

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
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => {
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

  // Load single batch details
  const loadBatchDetails = async (batchId) => {
    try {
      const details = await fetchSettlementBatchById(batchId);
      setSelectedBatchDetails(details);
    } catch (e) {
      console.error("Failed to load batch details:", e);
    }
  };

  useEffect(() => {
    loadUserAccounts();
    loadRates();
    loadBatches();
  }, [loadUserAccounts, loadRates, loadBatches, activePersonaKey]);

  // Compute live FX quote with debounce
  useEffect(() => {
    if (!quoteAmount || isNaN(quoteAmount) || Number(quoteAmount) <= 0) {
      setLiveQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const q = await fetchFxQuote(quoteFrom, quoteTo, quoteAmount);
        setLiveQuote(q);
      } catch (err) {
        console.error("FX quote failed", err);
        setLiveQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [quoteFrom, quoteTo, quoteAmount]);

  // Trigger 15-Row Sample Payroll Batch
  const handleRunSampleBatch = async () => {
    setIsExecutingSample(true);
    setUploadError("");
    setUploadSuccess("");
    try {
      const res = await runSampleBatch();
      setUploadSuccess(res?.summary || "15-row sample corporate payroll batch executed successfully!");
      if (res?.batch) {
        setSelectedBatchDetails(res);
      }
      await loadBatches();
    } catch (err) {
      setUploadError(err.message || "Failed to execute sample batch");
    } finally {
      setIsExecutingSample(false);
    }
  };

  // Upload Custom CSV File
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError("Please choose a CSV payout file to upload");
      return;
    }
    if (!sourceAccountId) {
      setUploadError("Please select a funding source account");
      return;
    }

    setIsUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const res = await uploadBatchFile(selectedFile, sourceAccountId);
      setUploadSuccess(res?.summary || "Batch uploaded and executed successfully!");
      if (res?.batch) {
        setSelectedBatchDetails(res);
      }
      setSelectedFile(null);
      await loadBatches();
    } catch (err) {
      setUploadError(err.message || "Failed to upload batch");
    } finally {
      setIsUploading(false);
    }
  };

  // Execute Cross-Border FX Transfer
  const handleExecuteFxTransfer = async (e) => {
    e.preventDefault();
    setFxTransferError("");
    setFxTransferSuccess(null);
    setFxTransferSubmitting(true);

    try {
      const idempotencyKey = "fx-tx-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
      const res = await createJournalTransfer(
        {
          sourceAccountId: Number(sourceAccountId),
          destinationAccountId: Number(fxTransferDestination),
          amount: Number(quoteAmount),
          currency: quoteFrom,
          referenceType: "CROSS_BORDER_FX",
          title: `Cross-Border Wire ${quoteFrom} -> ${quoteTo}`,
          content: `Automated 5-leg conversion @ ${liveQuote?.exchangeRate || "market"} (Fee: ${liveQuote?.feeAmount || 0} ${quoteFrom})`,
        },
        idempotencyKey
      );
      setFxTransferSuccess(res);
      await loadUserAccounts();
    } catch (err) {
      setFxTransferError(err.message || "FX transfer failed");
    } finally {
      setFxTransferSubmitting(false);
    }
  };

  // Generate Sample CSV Template for download
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "row_number,destination_account_id,amount,currency,description\n" +
      "1,2,4200.00,USD,Engineering Lead Bi-Weekly Salary\n" +
      "2,3,3800.00,USD,Product Manager Bi-Weekly Salary\n" +
      "3,AC-CORP-EUR-VENDOR,2500.00,EUR,Cloud Infrastructure EU Hosting\n" +
      "4,AC-CORP-INR-VENDOR,1800.00,INR,Mobile Design Agency Retainer\n" +
      "5,2,650.00,USD,Wellness Stipend\n" +
      "6,3,1100.00,USD,Performance Bonus\n" +
      "7,2,15000.00,USD,Executive Retention Bonus (Triggers AML Velocity Hold)\n" +
      "8,AC-CORP-GBP-VENDOR,3200.00,GBP,Legal Advisory Retainer\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "runestone_sample_payroll.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const personaInfo = PERSONAS[activePersonaKey] || { displayName: activePersonaKey };

  // Filtered batch rows
  const displayedItems = (selectedBatchDetails?.items || []).filter((item) => {
    if (batchItemFilter === "ALL") return true;
    return item.outcomeStatus === batchItemFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-yellow-400 text-black font-black rounded-lg shadow-brutal flex items-center justify-center">
              <Layers size={26} />
            </span>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
              Bulk CSV Settlements & FX Treasury
            </h1>
          </div>
          <p className="text-zinc-400 font-medium text-sm mt-1">
            Parallel Virtual-Thread CSV Execution, 0.50% Wire Fee Spread, and 5-Leg Double-Entry Accounting
          </p>
        </div>

        {/* Persona Indicator */}
        <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 px-4 py-2 rounded-xl text-sm self-start md:self-auto">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-zinc-400">Operator:</span>
          <span className="font-bold text-white">{personaInfo.displayName}</span>
        </div>
      </div>

      {/* Workspace Tab Switcher */}
      <div className="flex gap-3 border-b-2 border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab("batch")}
          className={`flex items-center gap-2.5 px-6 py-3 font-black text-sm uppercase tracking-wider rounded-xl transition-all ${
            activeTab === "batch"
              ? "bg-yellow-400 text-black shadow-brutal border-2 border-yellow-400"
              : "bg-zinc-900 text-zinc-400 hover:text-white border-2 border-zinc-800"
          }`}
        >
          <FileSpreadsheet size={18} />
          Bulk CSV Payroll Batch Engine
        </button>

        <button
          onClick={() => setActiveTab("fx")}
          className={`flex items-center gap-2.5 px-6 py-3 font-black text-sm uppercase tracking-wider rounded-xl transition-all ${
            activeTab === "fx"
              ? "bg-yellow-400 text-black shadow-brutal border-2 border-yellow-400"
              : "bg-zinc-900 text-zinc-400 hover:text-white border-2 border-zinc-800"
          }`}
        >
          <Coins size={18} />
          4-Leg Multi-Currency FX Engine
        </button>
      </div>

      {/* =========================================================================
          TAB 1: BULK CSV PAYOUT BATCH ENGINE
          ========================================================================= */}
      {activeTab === "batch" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Quick Action Hero Bar */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border-4 border-zinc-800 rounded-2xl p-6 shadow-brutal flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400 font-black text-xs uppercase tracking-widest">
                <Sparkles size={16} />
                High-Throughput Corporate Payroll Engine
              </div>
              <h2 className="text-2xl font-black uppercase text-white">
                One-Click 15-Row Corporate Payroll & Vendor Batch
              </h2>
              <p className="text-zinc-400 text-sm max-w-2xl leading-relaxed">
                Executes a live 15-row batch concurrently using Java 21 Virtual Threads across a bounded
                Semaphore(20). Contains clean domestic transfers, cross-currency FX payouts, high-value AML
                holds ($15,000 threshold), and an intentional overdrawn transaction demonstrating partial-failure
                isolation!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                onClick={handleRunSampleBatch}
                disabled={isExecutingSample}
                className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-6 py-4 rounded-xl shadow-brutal flex items-center gap-3 text-sm active:translate-x-0.5 active:translate-y-0.5"
              >
                {isExecutingSample ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <Play size={18} className="fill-black" />
                )}
                {isExecutingSample ? "Processing 15 Rows..." : "⚡ Run 15-Row Sample Payroll Batch"}
              </Button>

              <Button
                variant="outline"
                onClick={handleDownloadSampleCsv}
                className="border-2 border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold px-4 py-4 rounded-xl flex items-center gap-2 text-sm"
              >
                <Download size={16} />
                Sample CSV Template
              </Button>
            </div>
          </div>

          {/* Feedback Banners */}
          {uploadSuccess && (
            <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-xl p-4 text-emerald-300 flex items-start gap-3 animate-in fade-in">
              <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-bold">{uploadSuccess}</div>
            </div>
          )}

          {uploadError && (
            <div className="bg-rose-950/60 border-2 border-rose-500/50 rounded-xl p-4 text-rose-300 flex items-start gap-3 animate-in fade-in">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-bold">{uploadError}</div>
            </div>
          )}

          {/* Upload Custom File Card */}
          <Card className="bg-zinc-900/60 border-4 border-zinc-800 rounded-2xl shadow-brutal">
            <CardHeader className="pb-3 border-b-2 border-zinc-800/80">
              <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                <Upload size={20} className="text-yellow-400" />
                Upload Custom Corporate Settlement CSV
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleFileUpload} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                      Funding Source Treasury Account
                    </label>
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400"
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.accountNumber} ({acc.currency}) — Available: ${Number(acc.availableBalance).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                      CSV File (Auto-Computes SHA-256 Deduplication Hash)
                    </label>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-2.5 text-sm font-medium text-zinc-400 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-black file:uppercase file:bg-yellow-400 file:text-black hover:file:bg-yellow-300 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={!selectedFile || isUploading}
                    className="bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl shadow-brutal flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                    {isUploading ? "Uploading & Settling..." : "Ingest & Execute CSV Batch"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Active / Most Recent Batch Reconciliation Dashboard */}
          {selectedBatchDetails?.batch && (
            <div className="space-y-6">
              {/* Batch Header & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl shadow-brutal space-y-1">
                  <div className="text-zinc-500 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Batch Reference</span>
                    <Hash size={16} className="text-yellow-400" />
                  </div>
                  <div className="text-base font-black text-white truncate" title={selectedBatchDetails.batch.batchReference}>
                    {selectedBatchDetails.batch.batchReference}
                  </div>
                  <div className="text-xs text-zinc-400 font-mono truncate" title={selectedBatchDetails.batch.fileSha256Hash}>
                    SHA-256: {selectedBatchDetails.batch.fileSha256Hash?.substring(0, 16)}...
                  </div>
                </div>

                <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl shadow-brutal space-y-1">
                  <div className="text-zinc-500 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Settled Volume</span>
                    <TrendingUp size={16} className="text-emerald-400" />
                  </div>
                  <div className="text-2xl font-black text-emerald-400">
                    ${Number(selectedBatchDetails.batch.totalSettledAmount || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-zinc-400">
                    {selectedBatchDetails.batch.settledCount} of {selectedBatchDetails.batch.totalRows} settled
                  </div>
                </div>

                <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl shadow-brutal space-y-1">
                  <div className="text-zinc-500 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>AML Quarantined</span>
                    <AlertTriangle size={16} className="text-yellow-400" />
                  </div>
                  <div className="text-2xl font-black text-yellow-400">
                    {selectedBatchDetails.batch.heldAmlCount || 0}
                  </div>
                  <div className="text-xs text-zinc-400">Quarantined for compliance review</div>
                </div>

                <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl shadow-brutal space-y-1">
                  <div className="text-zinc-500 font-black text-xs uppercase tracking-wider flex items-center justify-between">
                    <span>Graceful Failures</span>
                    <XCircle size={16} className="text-rose-400" />
                  </div>
                  <div className="text-2xl font-black text-rose-400">
                    {selectedBatchDetails.batch.failedCount || 0}
                  </div>
                  <div className="text-xs text-zinc-400">Isolated without rolling back batch</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-zinc-900 border-2 border-zinc-800 p-5 rounded-2xl shadow-brutal space-y-3">
                <div className="flex justify-between items-center text-xs font-black uppercase text-zinc-400">
                  <span>Reconciliation Distribution</span>
                  <span className="text-white font-bold">
                    Batch Status:{" "}
                    <span
                      className={`px-2 py-0.5 rounded-md font-black ${
                        selectedBatchDetails.batch.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : selectedBatchDetails.batch.status === "COMPLETED_WITH_HOLDS"
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                          : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      }`}
                    >
                      {selectedBatchDetails.batch.status}
                    </span>
                  </span>
                </div>

                <div className="h-4 w-full bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
                  <div
                    style={{
                      width: `${
                        ((selectedBatchDetails.batch.settledCount || 0) /
                          (selectedBatchDetails.batch.totalRows || 1)) *
                        100
                      }%`,
                    }}
                    className="bg-emerald-500 h-full transition-all duration-500"
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
                    className="bg-yellow-400 h-full transition-all duration-500"
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
                    className="bg-rose-500 h-full transition-all duration-500"
                    title={`Failed: ${selectedBatchDetails.batch.failedCount}`}
                  />
                </div>
              </div>

              {/* Row-by-Row Reconciliation Items Table */}
              <Card className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-brutal overflow-hidden">
                <CardHeader className="border-b-2 border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <FileSpreadsheet size={20} className="text-yellow-400" />
                    Row-by-Row Reconciliation Ledger ({displayedItems.length} rows)
                  </CardTitle>

                  {/* Filter Pills */}
                  <div className="flex gap-2 text-xs font-bold">
                    {["ALL", "SETTLED", "PENDING_HOLD", "FAILED"].map((statusKey) => (
                      <button
                        key={statusKey}
                        onClick={() => setBatchItemFilter(statusKey)}
                        className={`px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${
                          batchItemFilter === statusKey
                            ? "bg-yellow-400 text-black font-black"
                            : "bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800"
                        }`}
                      >
                        {statusKey}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-black text-xs border-b border-zinc-800">
                        <tr>
                          <th className="py-3.5 px-4">Row #</th>
                          <th className="py-3.5 px-4">Destination Account</th>
                          <th className="py-3.5 px-4">Amount</th>
                          <th className="py-3.5 px-4">Status</th>
                          <th className="py-3.5 px-4">Outcome / Risk Diagnostic</th>
                          <th className="py-3.5 px-4">Idempotency Key</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 font-medium">
                        {displayedItems.map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-zinc-300">
                              #{item.rowNumber}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-zinc-300 bg-zinc-950 px-2 py-1 rounded border border-zinc-800 text-xs">
                                Acc ID: {item.destinationAccountId}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono font-bold text-white">
                              ${Number(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
                              <span className="text-xs text-zinc-400">{item.currency}</span>
                            </td>
                            <td className="py-3 px-4">
                              {item.outcomeStatus === "SETTLED" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                  <CheckCircle2 size={12} /> SETTLED
                                </span>
                              )}
                              {item.outcomeStatus === "PENDING_HOLD" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                                  <AlertTriangle size={12} /> AML HOLD
                                </span>
                              )}
                              {item.outcomeStatus === "FAILED" && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                  <XCircle size={12} /> FAILED
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs">
                              {item.journalEntryId && (
                                <span className="text-zinc-400 font-mono">Journal #{item.journalEntryId} — </span>
                              )}
                              <span
                                className={
                                  item.outcomeStatus === "FAILED"
                                    ? "text-rose-400 font-bold"
                                    : item.outcomeStatus === "PENDING_HOLD"
                                    ? "text-yellow-400 font-bold"
                                    : "text-zinc-300"
                                }
                              >
                                {item.failureOrHoldReason || item.description || "Settled cleanly"}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-zinc-500 truncate max-w-[160px]" title={item.idempotencyKey}>
                              {item.idempotencyKey}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Historical Batches Archive */}
          <Card className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-brutal overflow-hidden">
            <CardHeader className="border-b-2 border-zinc-800 pb-4">
              <CardTitle className="text-lg font-black uppercase flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock size={20} className="text-yellow-400" />
                  Historical Batches Archive ({batches.length})
                </span>
                <Button
                  variant="outline"
                  onClick={loadBatches}
                  className="text-xs font-bold border border-zinc-700 bg-zinc-950 px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <RefreshCw size={12} /> Refresh
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-black text-xs border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Operator</th>
                      <th className="py-3 px-4">File Name</th>
                      <th className="py-3 px-4">Reconciliation</th>
                      <th className="py-3 px-4">Settled Volume</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-medium">
                    {batches.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                          {b.batchReference}
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-bold">{b.uploadedByUser}</td>
                        <td className="py-3 px-4 text-zinc-400 text-xs truncate max-w-[140px]" title={b.fileName}>
                          {b.fileName}
                        </td>
                        <td className="py-3 px-4 text-xs font-bold">
                          <span className="text-emerald-400">{b.settledCount}</span> /{" "}
                          <span className="text-yellow-400">{b.heldAmlCount}</span> /{" "}
                          <span className="text-rose-400">{b.failedCount}</span>{" "}
                          <span className="text-zinc-500 font-normal">({b.totalRows} total)</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                          ${Number(b.totalSettledAmount || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-black ${
                              b.status === "COMPLETED"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : b.status === "COMPLETED_WITH_HOLDS"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-rose-500/20 text-rose-400"
                            }`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            variant="outline"
                            onClick={() => loadBatchDetails(b.id)}
                            className="text-xs font-black border border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-yellow-400 px-3 py-1 rounded"
                          >
                            Inspect Rows
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: 4-LEG MULTI-CURRENCY FX TREASURY ENGINE
          ========================================================================= */}
      {activeTab === "fx" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Live FX Rate Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
                <Coins size={20} className="text-yellow-400" />
                Live Supported Foreign Exchange Rates (0.50% Spread)
              </h2>
              <Button
                variant="outline"
                onClick={loadRates}
                className="text-xs font-bold border border-zinc-800 bg-zinc-900 px-3 py-1 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw size={12} /> Sync Rates
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {fxRates.map((r) => (
                <div
                  key={r.id}
                  className="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-xl shadow-brutal space-y-1 hover:border-yellow-400/50 transition-colors"
                >
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{r.baseCurrency} → {r.targetCurrency}</span>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
                      {r.spreadBps} bps
                    </span>
                  </div>
                  <div className="text-lg font-black text-white font-mono">
                    {Number(r.exchangeRate).toFixed(4)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-medium">0.50% treasury spread</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive FX Converter & Transfer Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Calculator & Wire Transfer */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-brutal">
                <CardHeader className="border-b-2 border-zinc-800 pb-4">
                  <CardTitle className="text-lg font-black uppercase flex items-center gap-2">
                    <ArrowRightLeft size={20} className="text-yellow-400" />
                    Multi-Currency Cross-Border Wire Execution
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  {/* Currencies & Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                        From Currency
                      </label>
                      <select
                        value={quoteFrom}
                        onChange={(e) => setQuoteFrom(e.target.value)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400"
                      >
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="INR">INR (Indian Rupee)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                        To Currency
                      </label>
                      <select
                        value={quoteTo}
                        onChange={(e) => setQuoteTo(e.target.value)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400"
                      >
                        <option value="INR">INR (Indian Rupee)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="USD">USD (US Dollar)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                        Transfer Amount
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={quoteAmount}
                        onChange={(e) => setQuoteAmount(e.target.value)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-yellow-400"
                        placeholder="1000.00"
                      />
                    </div>
                  </div>

                  {/* Account Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                        Funding Source Account
                      </label>
                      <select
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-bold text-white focus:outline-none focus:border-yellow-400"
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.accountNumber} ({acc.currency}) — ${Number(acc.availableBalance).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-zinc-400 mb-2">
                        Destination Counterparty Account ID
                      </label>
                      <Input
                        type="text"
                        value={fxTransferDestination}
                        onChange={(e) => setFxTransferDestination(e.target.value)}
                        className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl p-3 text-sm font-mono font-bold text-white focus:outline-none focus:border-yellow-400"
                        placeholder="Account ID (e.g. 2, 3)"
                      />
                    </div>
                  </div>

                  {/* Feedback Banners */}
                  {fxTransferSuccess && (
                    <div className="bg-emerald-950/60 border-2 border-emerald-500/50 rounded-xl p-4 text-emerald-300 text-sm space-y-1">
                      <div className="font-black uppercase flex items-center gap-2">
                        <CheckCircle2 size={18} /> 5-Leg FX Wire Settled Successfully!
                      </div>
                      <div className="font-mono text-xs text-zinc-300">
                        Journal Entry #{fxTransferSuccess.id} • Status: {fxTransferSuccess.status}
                      </div>
                    </div>
                  )}

                  {fxTransferError && (
                    <div className="bg-rose-950/60 border-2 border-rose-500/50 rounded-xl p-4 text-rose-300 text-sm flex items-center gap-2 font-bold">
                      <AlertTriangle size={18} />
                      {fxTransferError}
                    </div>
                  )}

                  {/* Execute Button */}
                  <Button
                    onClick={handleExecuteFxTransfer}
                    disabled={fxTransferSubmitting || quoteLoading || !liveQuote}
                    className="w-full bg-yellow-400 hover:bg-yellow-300 text-black font-black uppercase tracking-wider py-4 rounded-xl shadow-brutal flex items-center justify-center gap-2 text-base active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                  >
                    {fxTransferSubmitting ? (
                      <RefreshCw className="animate-spin" size={18} />
                    ) : (
                      <ArrowRight size={18} />
                    )}
                    {fxTransferSubmitting
                      ? "Executing 5-Leg Double-Entry..."
                      : `Execute 5-Leg FX Wire (${quoteFrom} → ${quoteTo})`}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Live Quote Card & Zero-Sum Invariant Breakdown */}
            <div className="lg:col-span-5 space-y-6">
              {/* Quote Breakdown Card */}
              <Card className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-brutal">
                <CardHeader className="border-b-2 border-zinc-800 pb-3">
                  <CardTitle className="text-sm font-black uppercase text-zinc-400 flex items-center justify-between">
                    <span>Live Institutional FX Quote</span>
                    {quoteLoading ? (
                      <RefreshCw size={14} className="animate-spin text-yellow-400" />
                    ) : (
                      <span className="text-emerald-400 text-xs font-bold">Active Stream</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {liveQuote ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-400">Gross Source Amount:</span>
                        <span className="font-mono font-bold text-white">
                          ${Number(liveQuote.sourceAmount).toFixed(2)} {liveQuote.fromCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/60 text-yellow-400">
                        <span className="flex items-center gap-1 font-bold">
                          Platform Wire Fee ({liveQuote.spreadFeePercent}):
                        </span>
                        <span className="font-mono font-bold">
                          -${Number(liveQuote.feeAmount).toFixed(2)} {liveQuote.fromCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-400">Net Converted Principal:</span>
                        <span className="font-mono font-bold text-white">
                          ${Number(liveQuote.netPrincipal).toFixed(2)} {liveQuote.fromCurrency}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/60">
                        <span className="text-zinc-400">Interbank Rate:</span>
                        <span className="font-mono font-bold text-white">
                          {Number(liveQuote.exchangeRate).toFixed(6)}
                        </span>
                      </div>

                      <div className="p-4 bg-zinc-950 border-2 border-zinc-800 rounded-xl space-y-1 mt-4">
                        <div className="text-xs uppercase font-black text-zinc-400">
                          Net Destination Payout
                        </div>
                        <div className="text-3xl font-black text-emerald-400 font-mono">
                          {Number(liveQuote.convertedTargetAmount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          <span className="text-lg">{liveQuote.toCurrency}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-zinc-500 font-medium text-sm">
                      Enter a transfer amount to calculate live conversion quote
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 5-Leg Double-Entry Zero-Sum Proof Card */}
              <Card className="bg-zinc-900 border-4 border-zinc-800 rounded-2xl shadow-brutal">
                <CardHeader className="border-b-2 border-zinc-800 pb-3">
                  <CardTitle className="text-sm font-black uppercase text-yellow-400 flex items-center gap-2">
                    <ShieldCheck size={18} />
                    5-Leg Double-Entry Zero-Sum Invariant
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 font-mono text-xs">
                  <div className="text-zinc-400 font-sans font-bold text-xs uppercase mb-1">
                    Atomic Multi-Currency Posting Legs:
                  </div>

                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <div className="font-bold text-zinc-300">Source Currency Legs ({quoteFrom}):</div>
                    <div className="text-rose-400">
                      • Leg 1 [DEBIT]: User Account (-${liveQuote?.sourceAmount || "1000.00"} {quoteFrom})
                    </div>
                    <div className="text-emerald-400">
                      • Leg 2 [CREDIT]: Fee Revenue AC-SYS-FEE-USD (+${liveQuote?.feeAmount || "5.00"} {quoteFrom})
                    </div>
                    <div className="text-emerald-400">
                      • Leg 3 [CREDIT]: FX Pool AC-SYS-FX-{quoteFrom} (+${liveQuote?.netPrincipal || "995.00"} {quoteFrom})
                    </div>
                    <div className="text-[11px] text-zinc-500 font-bold pt-1 border-t border-zinc-900">
                      ∑ SignedAmount({quoteFrom}) = 0.0000 (BALANCED)
                    </div>
                  </div>

                  <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <div className="font-bold text-zinc-300">Destination Currency Legs ({quoteTo}):</div>
                    <div className="text-rose-400">
                      • Leg 4 [DEBIT]: FX Pool AC-SYS-FX-{quoteTo} (-{liveQuote?.convertedTargetAmount || "83,082.50"} {quoteTo})
                    </div>
                    <div className="text-emerald-400">
                      • Leg 5 [CREDIT]: Destination Account (+{liveQuote?.convertedTargetAmount || "83,082.50"} {quoteTo})
                    </div>
                    <div className="text-[11px] text-zinc-500 font-bold pt-1 border-t border-zinc-900">
                      ∑ SignedAmount({quoteTo}) = 0.0000 (BALANCED)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

