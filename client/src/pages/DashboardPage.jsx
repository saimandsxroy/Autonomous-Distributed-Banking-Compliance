import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { fetchUserAccounts, getActivePersona, PERSONAS } from "../api/treasuryApi";
import { DoubleEntryBucketsCard } from "../components/DoubleEntryBucketsCard";
import { QuickTransfer } from "../components/dashboard/QuickTransfer";
import { RecentTransactions } from "../components/dashboard/RecentTransactions";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRevealed, setIsRevealed] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [allAccounts, setAllAccounts] = useState([]);

  // Initialize with deterministic instant state to permanently eliminate "Loading..." flash
  const activePersonaKey = getActivePersona();
  const personaMeta = PERSONAS[activePersonaKey] || PERSONAS.alice;

  const [activeAccount, setActiveAccount] = useState({
    id: personaMeta.accountId || 1,
    accountNumber: user?.accountNumber || (personaMeta.username === "bob" ? "AC-69D1D364271B" : personaMeta.username === "charlie" ? "AC-2B1F918288D9" : "AC-4BE19A42A8DC"),
    accountName: personaMeta.displayName,
    currency: "USD",
    postedBalance: user?.accountBalance || 249250.0,
    availableBalance: 36280.0,
    heldBalance: 212970.0,
    status: "ACTIVE",
  });

  const loadAccounts = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const accounts = await fetchUserAccounts().catch(() => []);
      if (Array.isArray(accounts) && accounts.length > 0) {
        setAllAccounts(accounts);
        setActiveAccount((prev) => {
          if (prev) {
            const found = accounts.find((a) => a.id === prev.id || a.accountNumber === prev.accountNumber);
            if (found) return found;
          }
          return accounts[0];
        });
      }
    } catch (err) {
      console.debug("Accounts telemetry update deferred:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();

    const handlePersonaChange = () => {
      loadAccounts();
    };

    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    window.addEventListener("foureyes_transfer_settled", handlePersonaChange);

    return () => {
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
      window.removeEventListener("foureyes_transfer_settled", handlePersonaChange);
    };
  }, [loadAccounts]);

  const handleCopy = () => {
    if (activeAccount?.accountNumber) {
      navigator.clipboard.writeText(activeAccount.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isFrozen = activeAccount?.status === "FROZEN_AML";

  return (
    <div className="space-y-7 pb-12">
      {/* =====================================================================
          EXECUTIVE HEADER BAR
          ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#F3F1EC] font-['Plus_Jakarta_Sans',sans-serif]">
              Treasury Overview
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 border ${
                isFrozen
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}
            >
              {isFrozen ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
              {isFrozen ? "FROZEN_AML PROTOCOL" : "ACTIVE LEDGER"}
            </span>
          </div>

          {/* Subtitle / Account Pill Strip */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#8E929B]">
            {/* Account Switcher or Number Pill */}
            {allAccounts.length > 1 ? (
              <div className="relative inline-flex items-center">
                <select
                  value={activeAccount?.id}
                  onChange={(e) => {
                    const chosen = allAccounts.find((a) => a.id === Number(e.target.value));
                    if (chosen) setActiveAccount(chosen);
                  }}
                  className="appearance-none bg-[#0C1017] border border-white/10 hover:border-white/20 text-[#F3F1EC] text-xs font-mono py-1 pl-2.5 pr-7 rounded-lg focus:outline-none transition-colors cursor-pointer"
                >
                  {allAccounts.map((a) => (
                    <option key={a.id} value={a.id} className="bg-[#0C1017] text-white">
                      Acc #{a.id} • {a.accountNumber} ({a.currency || "USD"})
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2 text-[#7A7D82] pointer-events-none" />
              </div>
            ) : (
              <span className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.08] text-[#F3F1EC] font-mono">
                {activeAccount?.accountNumber || "AC-4BE19A42A8DC"}
              </span>
            )}

            {/* 1-Click Copy with Animated Checkmark */}
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 text-[#8E929B] hover:text-white transition-all flex items-center gap-1.5"
              title="Copy active account number"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400 text-[11px] font-medium">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span className="text-[11px]">Copy Acc #</span>
                </>
              )}
            </button>

            {/* Currency Pill */}
            <span className="px-2 py-1 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[#6E737D] text-[11px]">
              {activeAccount?.currency || "USD"}
            </span>

            {/* Balance Visibility Toggle */}
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-1 rounded-lg text-[#7A7D82] hover:text-white transition-colors"
              title={isRevealed ? "Hide balances" : "Reveal balances"}
            >
              {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadAccounts}
            className={`p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] text-[#8E929B] hover:text-white transition-all ${
              isRefreshing ? "animate-spin text-[#38BDF8]" : ""
            }`}
            title="Refresh treasury telemetry"
          >
            <RefreshCw size={16} />
          </button>

          <Link
            to="/transfer"
            className="px-4 py-2.5 rounded-xl font-medium text-xs font-mono tracking-wider uppercase bg-[#F3F1EC] hover:bg-white text-black transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] group"
          >
            <span>+ Initiate Transfer</span>
            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* =====================================================================
          DOUBLE-ENTRY INVARIANT STRIP (3 Balance Buckets + Progress Bar)
          ===================================================================== */}
      <DoubleEntryBucketsCard
        account={activeAccount}
        isRevealed={isRevealed}
        onOpenCompliance={() => navigate("/compliance")}
      />

      {/* =====================================================================
          LOWER BENTO GRID (60% Recent Transactions / 40% Quick Transfer)
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Bento: Live Double-Entry Feed (60% / col-span-7) */}
        <div className="lg:col-span-7">
          <RecentTransactions
            isRevealed={isRevealed}
            activeAccount={activeAccount}
          />
        </div>

        {/* Right Bento: Instant Internal Transfer (40% / col-span-5) */}
        <div className="lg:col-span-5">
          <QuickTransfer
            isRevealed={isRevealed}
            activeAccount={activeAccount}
            onTransferSuccess={loadAccounts}
          />
        </div>
      </div>
    </div>
  );
}
