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
