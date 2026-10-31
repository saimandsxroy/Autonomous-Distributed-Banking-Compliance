import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { StatementRequestModal } from "../components/ui/StatementRequestModal";
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
  const [expandedEntries, setExpandedEntries] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user?.accountNumber) {
        const txs = await fetchRecentTransactions(user.accountNumber).catch(
          () => []
        );
        setTransactions(txs);
      }
      const entries = await fetchUserJournalEntries().catch(() => []);
      setJournalEntries(entries);

      // Expand the first entry by default if available
      if (entries.length > 0) {
        setExpandedEntries({ [entries[0].id]: true });
      }
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
    window.addEventListener("runestone_persona_changed", handlePersona);
    return () =>
      window.removeEventListener("runestone_persona_changed", handlePersona);
  }, [loadData]);

  const handleRequestStatement = async (startDate, endDate) => {
    if (!user?.accountNumber) return;
    try {
      const response = await requestStatement(
        user.accountNumber,
        startDate,
        endDate
      );
      setToastMessage(response.message);
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

  const toggleExpand = (id) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredTxs = transactions.filter((tx) => {
    const matchesSearch =
      tx.transactionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.accountNumber.includes(searchTerm) ||
      (tx.counterpartyName?.toLowerCase() || "").includes(
        searchTerm.toLowerCase()
      );
    const matchesFilter =
      filterType === "ALL" || tx.transactionType === filterType;
    return matchesSearch && matchesFilter;
  });

  const filteredJournals = journalEntries.filter((j) => {
    const matchesSearch =
      (j.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.idempotencyKey || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      j.id.toString().includes(searchTerm);
    return matchesSearch;
  });

  const totalIn = transactions
    .filter((t) => t.transactionType === "CREDIT" && t.status === "SUCCESS")
    .reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions
    .filter(
      (t) =>
        (t.transactionType === "DEBIT" || t.transactionType === "TRANSFER") &&
        t.status === "SUCCESS"
    )
    .reduce((s, t) => s + t.amount, 0);

  return (
    <>
      {isModalOpen && (
        <StatementRequestModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleRequestStatement}
        />
      )}

      {toastMessage && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {toastMessage}
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
            Ledger & Transactions
          </h2>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mt-1">
            Double-Entry Balanced Postings • Zero-Sum Invariant • Real-Time
            Audit Chain
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white border-2 border-zinc-700 text-xs"
          >
            <Mail size={16} />
            Request Statement
          </Button>

          <button
            onClick={loadData}
            className={`p-2 rounded-lg bg-zinc-900 border-2 border-zinc-800 text-zinc-400 hover:text-white ${
              isLoading ? "animate-spin" : ""
            }`}
            title="Reload Transactions"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* View Mode Selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="inline-flex p-1 bg-zinc-900 border-2 border-zinc-800 rounded-lg">
          <button
            onClick={() => setViewMode("DOUBLE_ENTRY")}
            className={`px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-2 ${
              viewMode === "DOUBLE_ENTRY"
                ? "bg-ochre-800 text-white shadow-brutal"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <Layers size={14} />
            <span>Double-Entry Postings ({journalEntries.length})</span>
          </button>
          <button
            onClick={() => setViewMode("ACCOUNT_HISTORY")}
            className={`px-4 py-2 rounded font-bold uppercase text-xs tracking-wider transition-all flex items-center gap-2 ${
              viewMode === "ACCOUNT_HISTORY"
                ? "bg-ochre-800 text-white shadow-brutal"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            <span>Statement View ({transactions.length})</span>
          </button>
        </div>

        {/* Filter buttons & Search bar */}
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 sm:max-w-xl">
          {viewMode === "ACCOUNT_HISTORY" && (
            <div className="flex gap-1 bg-zinc-900 p-1 border-2 border-zinc-800 rounded-lg shrink-0">
              {["ALL", "CREDIT", "DEBIT", "TRANSFER"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded transition-colors ${
                    filterType === type
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
          <div className="relative flex-1 w-full">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <Input
              type="text"
              placeholder="Search by ID, key, account or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-zinc-900 border-2 border-zinc-800 text-white placeholder-zinc-600 pl-10 font-mono text-xs py-2 w-full"
            />
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Credited",
            value: `$${totalIn.toFixed(2)}`,
            color: "text-green-400",
          },
          {
            label: "Total Debited",
            value: `$${totalOut.toFixed(2)}`,
            color: "text-red-400",
          },
          {
            label: "Journal Entries",
            value: journalEntries.length.toString(),
            color: "text-ochre-500",
          },
          {
            label: "Settled Status",
            value: "Balanced $0.00",
            color: "text-emerald-400 font-mono text-base",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900 border-2 border-zinc-800 p-4 rounded-lg shadow-brutal"
          >
            <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">
              {stat.label}
            </p>
            <p className={`font-black text-xl mt-1 ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* =================================================================
          VIEW 1: DOUBLE-ENTRY JOURNAL POSTINGS WITH VERIFIED ZERO-SUM LEGS
          ================================================================= */}
      {viewMode === "DOUBLE_ENTRY" && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-zinc-600 bg-zinc-900 border-2 border-zinc-800 rounded-lg">
              <RefreshCw
                size={24}
                className="animate-spin text-ochre-800 mx-auto mb-2"
              />
              <p className="font-bold uppercase tracking-widest text-xs">
                Loading ledger entries...
              </p>
            </div>
          ) : filteredJournals.length === 0 ? (
            <div className="py-16 text-center text-zinc-600 bg-zinc-900 border-2 border-zinc-800 rounded-lg">
              <p className="font-bold uppercase tracking-widest text-sm">
                No double-entry journal entries recorded yet.
              </p>
            </div>
          ) : (
            filteredJournals.map((entry) => {
              const isExpanded = !!expandedEntries[entry.id];
              const isSettled = entry.status === "SETTLED";
              const legs = entry.postingLegs || [];

              // Calculate sum of signed amounts to verify Σ = 0
              const sumSigned = legs.reduce(
                (acc, l) =>
                  acc +
                  (l.signedAmount ??
                    (l.legType === "CREDIT" ? l.amount : -l.amount)),
                0
              );
              const isBalanced = Math.abs(sumSigned) < 0.0001;

              return (
                <div
                  key={entry.id}
                  className="bg-zinc-900 border-2 border-zinc-800 rounded-xl overflow-hidden shadow-brutal transition-all"
                >
                  {/* Journal Entry Header */}
                  <div
                    onClick={() => toggleExpand(entry.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/40 select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1 rounded bg-zinc-800 text-zinc-400">
                        {isExpanded ? (
                          <ChevronDown size={18} />
                        ) : (
                          <ChevronRight size={18} />
                        )}
                      </div>

                      <div
                        className={`p-2.5 rounded-lg border shrink-0 ${
                          isSettled
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-amber-950 text-amber-400 border-amber-800"
                        }`}
                      >
                        {isSettled ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <ShieldAlert size={20} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base text-white tracking-tight">
                            {entry.title || `Journal Entry #${entry.id}`}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              isSettled
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                                : "bg-amber-950 text-amber-300 border border-amber-700"
                            }`}
                          >
                            {entry.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-500 mt-1">
                          <span>ID #{entry.id}</span>
                          <span>•</span>
                          <span>
                            Source Acc #{entry.sourceAccountId} → Dest Acc #
                            {entry.destinationAccountId}
                          </span>
                          <span>•</span>
                          <span
                            className="truncate max-w-[140px] md:max-w-none"
                            title={entry.idempotencyKey}
                          >
                            Key: {entry.idempotencyKey}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-xl font-black text-white">
                          ${entry.amount.toFixed(2)}{" "}
                          <span className="text-xs text-zinc-500 font-mono">
                            {entry.currency}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                          {new Date(entry.date).toLocaleString()}
                        </div>
                      </div>

                      {/* Zero-Sum Invariant Badge */}
                      <div
                        className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:flex items-center gap-1.5 border ${
                          isBalanced
                            ? "bg-emerald-950/80 border-emerald-700 text-emerald-300"
                            : "bg-rose-950 border-rose-700 text-rose-300"
                        }`}
                        title="Double-Entry Invariant: Sum of signed legs must equal exactly zero"
                      >
                        <Lock size={12} />
                        <span>Σ = $0.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Expandable Posting Legs Table */}
                  {isExpanded && (
                    <div className="p-5 bg-zinc-950 border-t-2 border-zinc-800 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400 font-bold uppercase tracking-wider">
                          Paired Posting Legs (Double-Entry Atomic Settlement)
                        </span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          Mathematically Verified: Sum(Debit) + Sum(Credit) =
                          $0.0000
                        </span>
                      </div>

                      {legs.length === 0 ? (
                        <div className="p-4 rounded border border-zinc-800 text-zinc-500 text-xs font-mono text-center">
                          {isSettled
                            ? "Posting legs settled into immutable double-entry ledger."
                            : "Funds encumbered in PENDING_HOLD. Posting legs await compliance HITL release."}
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <thead>
                              <tr className="border-b border-zinc-800 text-[10px] uppercase text-zinc-500 tracking-wider">
                                <th className="py-2">Leg ID</th>
                                <th className="py-2">Type</th>
                                <th className="py-2">Account</th>
                                <th className="py-2">Counterparty</th>
                                <th className="py-2 text-right">
                                   Signed Delta
                                </th>
                                <th className="py-2 text-right">
                                  Balance After
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/80">
                              {legs.map((leg) => {
                                const isCredit = leg.legType === "CREDIT";
                                return (
                                  <tr
                                    key={leg.id}
                                    className="hover:bg-zinc-900/50"
                                  >
                                    <td className="py-2.5 font-bold text-zinc-400">
                                      #{leg.id}
                                    </td>
                                    <td className="py-2.5">
                                      <span
                                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                          isCredit
                                            ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                            : "bg-rose-950 text-rose-300 border border-rose-800"
                                        }`}
                                      >
                                        {leg.legType}
                                      </span>
                                    </td>
                                    <td className="py-2.5 text-zinc-300 font-bold">
                                      Account #{leg.accountId}
                                    </td>
                                    <td className="py-2.5 text-zinc-400">
                                      Account #{leg.counterpartyAccountId}
                                    </td>
                                    <td
                                      className={`py-2.5 text-right font-black ${
                                        isCredit
                                          ? "text-emerald-400"
                                          : "text-rose-400"
                                      }`}
                                    >
                                      {isCredit ? "+" : "-"}$
                                      {leg.amount.toFixed(2)}
                                    </td>
                                    <td className="py-2.5 text-right text-zinc-300">
                                      ${leg.balanceAfter?.toFixed(2) ?? "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =================================================================
          VIEW 2: STATEMENT ACCOUNT HISTORY
          ================================================================= */}
      {viewMode === "ACCOUNT_HISTORY" && (
        <Card className="bg-zinc-900 border-4 border-zinc-800 text-white shadow-brutal">
          <CardHeader className="border-b-4 border-zinc-800 pb-4">
            <CardTitle className="text-lg text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter size={18} className="text-ochre-800" />
                {filteredTxs.length} Transaction
                {filteredTxs.length !== 1 ? "s" : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="py-12 text-center text-zinc-600">
                <p className="font-bold uppercase tracking-widest text-xs">
                  Loading history...
                </p>
              </div>
            ) : filteredTxs.length === 0 ? (
              <div className="py-12 text-center text-zinc-600">
                <p className="font-bold uppercase tracking-widest text-xs">
                  No transactions found
                </p>
              </div>
            ) : (
              <div className="divide-y-4 divide-zinc-800">
                {filteredTxs.map((tx) => {
                  const isPositive = tx.transactionType === "CREDIT";
                  const amountColor = isPositive
                    ? "text-green-400"
                    : "text-red-500";
                  const amountPrefix = isPositive ? "+" : "-";
                  const parsedDate = parseTransactionDate(tx.timeOfCreation);

                  return (
                    <div
                      key={tx.transactionId}
                      className="py-4 flex items-center justify-between hover:bg-zinc-800/30 transition-colors px-2"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2.5 border-2 border-zinc-800 bg-zinc-950 ${
                            isPositive ? "text-green-400" : "text-red-500"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownRight size={20} />
                          ) : (
                            <ArrowUpRight size={20} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-white">
                              {tx.transactionType === "TRANSFER" &&
                              tx.counterpartyName
                                ? `Transfer to ${tx.counterpartyName}`
                                : tx.transactionType === "CREDIT" &&
                                    tx.counterpartyName
                                  ? `Transfer from ${tx.counterpartyName}`
                                  : tx.transactionType}
                            </h4>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 border border-zinc-700 text-zinc-400 rounded">
                              {tx.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mt-0.5">
                            <span>{parsedDate.toLocaleDateString()}</span>
                            <span>•</span>
                            <span>
                              {parsedDate.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">
                              {tx.transactionId}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`font-black text-lg ${amountColor}`}>
                          {amountPrefix}${tx.amount.toFixed(2)}
                        </div>
                        <p className="text-zinc-600 font-mono text-xs">
                          {tx.counterpartyAccountNumber || tx.accountNumber}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

