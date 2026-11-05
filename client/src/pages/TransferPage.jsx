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
