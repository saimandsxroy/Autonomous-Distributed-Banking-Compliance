import { useState, useEffect, useCallback } from "react";
import {
  Send,
  UserSearch,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Unlock,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Copy,
  Zap,
  Check,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  lookupAccountName,
  transferFunds,
  fetchRecentTransactions,
} from "../services/dashboard";
import {
  createJournalTransfer,
  fetchUserAccounts,
  fetchAllTreasuryAccounts,
  getActivePersona,
  PERSONAS,
} from "../api/treasuryApi";
import { useNavigate } from "react-router-dom";

export function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Basic transfer form state
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [resolvedName, setResolvedName] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Advanced Treasury & Idempotency Controls
  const [sourceAccountId, setSourceAccountId] = useState(1);
  const [destAccountId, setDestAccountId] = useState(2);
  const [treasuryAmount, setTreasuryAmount] = useState("50.00");
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => "tx-" + Math.random().toString(36).substring(2, 10)
  );
  const [isKeyLocked, setIsKeyLocked] = useState(false);
  const [lastJournalResult, setLastJournalResult] = useState(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [rawResponseStatus, setRawResponseStatus] = useState(null);

  // Recent recipients state
  const [recentRecipients, setRecentRecipients] = useState([]);

  const loadAccounts = useCallback(async () => {
    try {
      const [accs, institutionalAccs] = await Promise.all([
        fetchUserAccounts().catch(() => []),
        fetchAllTreasuryAccounts().catch(() => []),
      ]);
      setTreasuryAccounts(accs);
      const combined = institutionalAccs.length > 0 ? institutionalAccs : accs;
      setAllAccounts(combined);

      if (accs.length > 0) {
        setSourceAccountId(accs[0].id);
      } else if (combined.length > 0) {
        setSourceAccountId(combined[0].id);
      }

      if (combined.length > 1) {
        setDestAccountId(combined[1].id);
      }
    } catch (e) {
      console.error("Failed to load treasury accounts", e);
    }
  }, []);

  const loadRecentRecipients = useCallback(async () => {
    if (!user?.accountNumber) return;
    try {
      const data = await fetchRecentTransactions(user.accountNumber);
      const outgoingTransfers = data.filter(
        (tx) =>
          tx.transactionType === "TRANSFER" &&
          tx.counterpartyAccountNumber &&
          tx.counterpartyName
      );

      const uniqueRecipients = new Map();
      outgoingTransfers.forEach((tx) => {
        if (
          tx.counterpartyAccountNumber &&
          !uniqueRecipients.has(tx.counterpartyAccountNumber)
        ) {
          uniqueRecipients.set(tx.counterpartyAccountNumber, {
            name: tx.counterpartyName || "Unknown",
            account: tx.counterpartyAccountNumber,
            lastAmount: tx.amount,
          });
        }
      });

      setRecentRecipients(Array.from(uniqueRecipients.values()).slice(0, 5));
    } catch {
      console.error("Failed to load recipients");
    }
  }, [user?.accountNumber]);

  useEffect(() => {
    loadAccounts();
    loadRecentRecipients();
  }, [loadAccounts, loadRecentRecipients]);

  const generateNewKey = () => {
    setIdempotencyKey("tx-" + Math.random().toString(36).substring(2, 10));
    setRawResponseStatus(null);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(idempotencyKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleLookup = async () => {
    if (receiver.length < 5) {
      setError("Please enter a valid account number.");
      return;
    }

    if (receiver === user?.accountNumber) {
      setError("You cannot transfer to yourself.");
      return;
    }

    setIsLookingUp(true);
    setError("");
    setResolvedName(null);

    try {
      const response = await lookupAccountName(receiver);
      if (response.responseCode === "004" && response.accountInfo) {
        setResolvedName(response.accountInfo.accountName);
      } else {
        setError(response.responseMessage || "Account not found.");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error looking up account."
      );
    } finally {
      setIsLookingUp(false);
    }
  };

  // Standard portal transfer
  const handleStandardTransfer = async (e) => {
    e.preventDefault();
    if (!resolvedName || !user?.accountNumber) return;

    setIsTransferring(true);
    setError("");
    setSuccessMessage("");
    setLastJournalResult(null);

    try {
      await transferFunds({
        sender: user.accountNumber,
        receiver,
        amount: parseFloat(amount),
      });

      setSuccessMessage(
        `$${parseFloat(amount).toFixed(2)} sent to ${resolvedName} successfully.`
      );
      setReceiver("");
      setAmount("");
      setResolvedName(null);
      setTimeout(() => setSuccessMessage(""), 5000);
      loadRecentRecipients();
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transfer failed.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Advanced Treasury Double-Entry Transfer (with Idempotency + AML)
  const handleTreasuryTransfer = async (overrideAmount) => {
    const amt = overrideAmount ?? parseFloat(treasuryAmount || amount || "50");
    if (isNaN(amt) || amt <= 0) {
      setError("Please specify a valid transfer amount.");
      return;
    }

    setIsTransferring(true);
    setError("");
    setSuccessMessage("");
    setLastJournalResult(null);
    setRawResponseStatus(null);

    try {
      const res = await createJournalTransfer(
        {
          sourceAccountId,
          destinationAccountId: destAccountId,
          amount: amt,
          currency: "USD",
          title: `Treasury Transfer #${idempotencyKey}`,
        },
        idempotencyKey
      );

      setLastJournalResult(res);
      await loadAccounts();
      window.dispatchEvent(new CustomEvent("foureyes_transfer_settled"));

      if (res.status === "SETTLED") {
        setSuccessMessage(
          `✓ Journal Entry #${res.id} SETTLED immediately. Signed debit/credit posting legs committed.`
        );
      } else if (res.status === "PENDING_HOLD") {
        setSuccessMessage(
          `⚠️ Transfer Intercepted by AML/Velocity Engine! Placed in PENDING_HOLD.`
        );
      }

      if (!isKeyLocked) {
        generateNewKey();
      }
    } catch (err) {
      const msg = err.message || "";
      setError(`Transfer Rejected: ${msg}`);
      if (
        err.status === 422 ||
        msg.includes("422") ||
        msg.includes("reused with different payload")
      ) {
        setRawResponseStatus(
          "HTTP 422 UNPROCESSABLE_ENTITY (Idempotency Hash Mismatch)"
        );
      } else if (err.status === 409 || msg.includes("409")) {
        setRawResponseStatus("HTTP 409 CONFLICT (In-Flight Request)");
      }
    } finally {
      setIsTransferring(false);
    }
  };

  const handleTestTamper = () => {
    const current = parseFloat(treasuryAmount || amount || "50");
    handleTreasuryTransfer(current + 1.0);
  };

  const persona = getActivePersona();
  const personaInfo = PERSONAS[persona] || PERSONAS.alice;

  return (
    <div className="space-y-7 pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
            Transfer Funds
          </h2>
          <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
            Double-Entry Treasury Ledger • Idempotency Locking • Multi-Hop AML Interception
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0C1017] border border-white/[0.08] rounded-xl text-xs font-mono text-[#8E929B] self-start sm:self-auto">
          <span className="text-[#6E737D] uppercase">Active Clearance:</span>
          <span className="font-semibold text-[#F3F1EC]">
            {personaInfo.displayName}
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded border uppercase font-medium bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/20">
            {personaInfo.roleLabel || "USER"}
          </span>
        </div>
      </header>

      {/* Result Feedback Banners */}
      {lastJournalResult && (
        <div
          className={`p-5 rounded-2xl border backdrop-blur-xl animate-in fade-in duration-300 ${
            lastJournalResult.status === "SETTLED"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  lastJournalResult.status === "SETTLED"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {lastJournalResult.status === "SETTLED" ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <ShieldAlert size={22} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold tracking-tight text-[#F3F1EC]">
                    Status: {lastJournalResult.status}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] uppercase">
                    Journal #{lastJournalResult.id}
                  </span>
                </div>
                <div className="text-xs font-mono text-[#8E929B] mt-0.5">
                  Idempotency Hash: {lastJournalResult.idempotencyKey}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastJournalResult.status === "PENDING_HOLD" ? (
                <button
                  onClick={() => navigate("/compliance")}
                  className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                >
                  <span>Review in AML Compliance Center</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => navigate("/transactions")}
                  className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold text-xs font-mono uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                >
                  <span>View Verified Posting Legs</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs font-mono space-y-1.5">
            {lastJournalResult.riskReason && (
              <div className="p-3 bg-[#07090D] rounded-xl border border-amber-500/30 text-amber-300">
                <span className="font-semibold uppercase text-[10px] block text-amber-400 mb-0.5">
                  Triggered AML Risk Reason:
                </span>
                {lastJournalResult.riskReason}
              </div>
            )}
            <div className="flex flex-wrap gap-4 pt-1 text-[#8E929B]">
              <span>
                Amount: <strong className="text-white">${lastJournalResult.amount?.toFixed(2)} {lastJournalResult.currency}</strong>
              </span>
              <span>Source Account: <strong className="text-white">#{lastJournalResult.sourceAccountId}</strong></span>
              <span>Destination Account: <strong className="text-white">#{lastJournalResult.destinationAccountId}</strong></span>
            </div>
          </div>
        </div>
      )}

      {rawResponseStatus && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs font-mono font-semibold flex items-center gap-3">
          <AlertCircle size={18} className="text-rose-400 shrink-0" />
          <span>{rawResponseStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Direct Account Transfer Card */}
        <div className="lg:col-span-6">
          <div className="h-full bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex items-center justify-center">
                    <Send size={15} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-[#F3F1EC] tracking-[-0.02em]">
                      Direct Account Transfer
                    </h3>
                    <p className="font-mono text-[11px] text-[#7A7D82]">
                      Standard intra-bank account resolution
                    </p>
                  </div>
                </div>
              </div>

              {successMessage && !lastJournalResult && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs font-mono text-emerald-300 animate-in fade-in">
                  <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && !lastJournalResult && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-xs font-mono text-rose-300 animate-in fade-in">
                  <AlertCircle size={16} className="text-rose-400 shrink-0" />
                  <span>{error}</span>
