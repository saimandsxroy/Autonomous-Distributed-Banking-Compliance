import { useState, useEffect, useCallback, useMemo } from "react";
import { StatementRequestModal } from "../components/ui/StatementRequestModal";
import { ExpandableJournalTable } from "../components/ExpandableJournalTable";
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Search,
  Filter,
  Mail,
  Layers,
  ChevronDown,
  ChevronRight,
  Lock,
  ShieldAlert,
  RefreshCw,
  Clock,
  XCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchRecentTransactions,
  requestStatement,
  parseTransactionDate,
} from "../services/dashboard";
import { fetchUserJournalEntries } from "../api/treasuryApi";

export function TransactionsPage() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState("DOUBLE_ENTRY");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [transactions, setTransactions] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user?.accountNumber) {
        const txs = await fetchRecentTransactions(user.accountNumber).catch(() => []);
        setTransactions(Array.isArray(txs) ? txs : []);
      }
      const entries = await fetchUserJournalEntries().catch(() => []);
      setJournalEntries(Array.isArray(entries) ? entries : []);
    } catch (error) {
      console.error(error);
      setToastMessage("Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.accountNumber]);

  useEffect(() => {
    loadData();
    const handlePersona = () => loadData();
    window.addEventListener("foureyes_persona_changed", handlePersona);
    window.addEventListener("runestone_persona_changed", handlePersona);
    window.addEventListener("foureyes_transfer_settled", handlePersona);
    return () => {
      window.removeEventListener("foureyes_persona_changed", handlePersona);
      window.removeEventListener("runestone_persona_changed", handlePersona);
      window.removeEventListener("foureyes_transfer_settled", handlePersona);
    };
  }, [loadData]);

  const handleRequestStatement = async (startDate, endDate) => {
    if (!user?.accountNumber) return;
    try {
      const response = await requestStatement(user.accountNumber, startDate, endDate);
      setToastMessage(response.message || "Statement requested successfully.");
    } catch (error) {
      console.error(error);
      setToastMessage("Failed to request statement.");
    } finally {
      setIsModalOpen(false);
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const filteredTxs = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        (tx.transactionId || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.accountNumber || "").includes(searchTerm) ||
        (tx.counterpartyName?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesFilter = filterType === "ALL" || tx.transactionType === filterType;
      return matchesSearch && matchesFilter;
    });
  }, [transactions, searchTerm, filterType]);

  const filteredJournals = useMemo(() => {
    return journalEntries.filter((j) => {
      const matchesSearch =
        (j.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.idempotencyKey || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (j.id?.toString() || "").includes(searchTerm);
      return matchesSearch;
    });
  }, [journalEntries, searchTerm]);

  // Compute dynamic sums across actual loaded legs and transactions
  const { totalCredited, totalDebited } = useMemo(() => {
    let creditSum = 0;
    let debitSum = 0;

    if (journalEntries.length > 0) {
      journalEntries.forEach((entry) => {
        if (entry.postingLegs && entry.postingLegs.length > 0) {
          entry.postingLegs.forEach((leg) => {
            const isCredit = leg.legType === "CREDIT" || leg.entryType === "CREDIT";
