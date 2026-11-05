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
