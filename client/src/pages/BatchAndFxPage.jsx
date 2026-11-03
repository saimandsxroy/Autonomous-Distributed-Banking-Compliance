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
