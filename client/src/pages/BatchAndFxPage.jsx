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

