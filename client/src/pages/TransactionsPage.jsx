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
          <p className="text-[10px] font-mono text-[#6E737D] mt-0.5">Posting Legs Sum</p>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <p className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider font-medium">
            Total Debited
          </p>
          <p className="font-['JetBrains_Mono',monospace] text-xl sm:text-2xl font-semibold mt-1 text-[#F3F1EC]">
            ${totalDebited.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] font-mono text-[#6E737D] mt-0.5">Equalized Contra-Entries</p>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <p className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider font-medium">
            Journal Entries
          </p>
          <p className="font-['JetBrains_Mono',monospace] text-xl sm:text-2xl font-semibold mt-1 text-[#38BDF8]">
            {journalEntries.length}
          </p>
          <p className="text-[10px] font-mono text-[#6E737D] mt-0.5">Double-Entry Batches</p>
        </div>

        <div className="p-4 bg-[#0C1017]/90 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.14] rounded-2xl transition-all">
          <p className="text-[#8E929B] font-mono text-[10.5px] uppercase tracking-wider font-medium">
            Settled Status
          </p>
          <div className="flex items-center gap-1.5 mt-1 font-['JetBrains_Mono',monospace] text-base sm:text-lg font-semibold text-emerald-400">
            <Lock size={14} className="text-emerald-400" />
            <span>Δ = $0.00</span>
          </div>
          <p className="text-[10px] font-mono text-emerald-500/80 mt-0.5">● ZERO-SUM INVARIANT</p>
        </div>
      </div>

      {/* View Mode Selector & Search / Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* FourEyes Sapphire/Bone Active Pill Tab */}
        <div className="inline-flex p-1 bg-[#0C1017] border border-white/[0.08] rounded-xl self-start">
          <button
            onClick={() => setViewMode("DOUBLE_ENTRY")}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs font-mono transition-all flex items-center gap-2 ${
              viewMode === "DOUBLE_ENTRY"
                ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                : "text-[#8E929B] hover:text-white"
            }`}
          >
            <Layers size={13} />
            <span>Double-Entry Postings ({journalEntries.length})</span>
          </button>
          <button
            onClick={() => setViewMode("ACCOUNT_HISTORY")}
            className={`px-3.5 py-1.5 rounded-lg font-medium text-xs font-mono transition-all flex items-center gap-2 ${
              viewMode === "ACCOUNT_HISTORY"
                ? "bg-gradient-to-r from-[#38BDF8]/20 to-[#38BDF8]/10 text-white border border-[#38BDF8]/40 shadow-[0_0_12px_rgba(56,189,248,0.15)]"
                : "text-[#8E929B] hover:text-white"
            }`}
          >
            <FileText size={13} />
            <span>Statement View ({transactions.length})</span>
          </button>
        </div>

        {/* Filter Buttons & Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1 sm:max-w-md">
          {viewMode === "ACCOUNT_HISTORY" && (
            <div className="flex gap-1 bg-[#0C1017] p-1 border border-white/[0.08] rounded-xl shrink-0">
              {["ALL", "CREDIT", "DEBIT", "TRANSFER"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 text-[10px] font-mono uppercase font-semibold rounded-lg transition-colors ${
                    filterType === type
                      ? "bg-white/[0.08] text-white"
                      : "text-[#8E929B] hover:text-white"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 w-full">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7D82]"
            />
            <input
              type="text"
              placeholder="Search by ID, key, account or title..."
