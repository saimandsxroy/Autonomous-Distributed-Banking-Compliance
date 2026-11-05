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
