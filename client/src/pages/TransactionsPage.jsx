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
            const amt = Number(leg.amount || 0);
            if (isCredit) creditSum += amt;
            else debitSum += amt;
          });
        } else {
          const amt = Number(entry.amount || 0);
          creditSum += amt;
          debitSum += amt;
        }
      });
    }

    if (creditSum === 0 && debitSum === 0 && transactions.length > 0) {
      transactions.forEach((tx) => {
        const amt = Number(tx.amount || 0);
        if (tx.transactionType === "CREDIT") creditSum += amt;
        else debitSum += amt;
      });
    }

    return { totalCredited: creditSum, totalDebited: debitSum };
  }, [journalEntries, transactions]);

  return (
    <div className="space-y-7 pb-12 font-['Plus_Jakarta_Sans',sans-serif]">
      {isModalOpen && (
        <StatementRequestModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleRequestStatement}
        />
      )}

      {toastMessage && (
        <div className="fixed top-5 right-5 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl z-50 text-xs font-mono font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
            Ledger & Transactions
          </h2>
          <p className="font-mono text-[11px] text-[#7A7D82] mt-0.5">
            Double-Entry Balanced Postings • Zero-Sum Invariant • Real-Time Audit Chain
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 rounded-xl text-xs font-mono font-medium transition-all"
          >
            <Mail size={14} className="text-[#38BDF8]" />
            <span>Request Statement</span>
          </button>

          <button
            onClick={loadData}
            className={`p-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-[#8E929B] hover:text-white transition-all ${
              isLoading ? "animate-spin text-[#38BDF8]" : ""
            }`}
            title="Reload Transactions"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* Stat Cards Strip (4 Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <p className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider font-medium">
            Total Credited
          </p>
          <p className="font-['JetBrains_Mono',monospace] text-xl sm:text-2xl font-semibold mt-1 text-emerald-400">
            ${totalCredited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
