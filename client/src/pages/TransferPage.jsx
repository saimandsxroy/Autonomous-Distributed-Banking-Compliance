import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import {
  Send,
  UserSearch,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  ShieldAlert,
  ArrowRight,
  Copy,
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
