import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import {
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  ArrowRight,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { fetchBalance } from "../../services/dashboard";
import { fetchUserAccounts } from "../../api/treasuryApi";
import { useNavigate } from "react-router-dom";

export function TotalBalance({ isRevealed, setIsRevealed }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [balanceInfo, setBalanceInfo] = useState({
    accountName: user?.accountName || "Loading...",
    accountBalance: user?.accountBalance || 0,
    accountNumber: user?.accountNumber || "...",
  });
  const [treasuryAccount, setTreasuryAccount] = useState(null);
  const [allUserAccounts, setAllUserAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBalance = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user?.accountNumber) {
        const data = await fetchBalance(user.accountNumber).catch(() => null);
        if (data?.accountInfo) {
          setBalanceInfo(data.accountInfo);
        }
      }

      const accounts = await fetchUserAccounts().catch(() => []);
      setAllUserAccounts(accounts || []);
      if (accounts && accounts.length > 0) {
        setTreasuryAccount((prev) => {
          if (prev) {
            const found = accounts.find((a) => a.id === prev.id);
            if (found) return found;
          }
          return accounts[0];
        });
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.accountNumber]);

  useEffect(() => {
    loadBalance();
    const handlePersonaChange = () => {
      loadBalance();
    };
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () =>
      window.removeEventListener(
        "runestone_persona_changed",
        handlePersonaChange
      );
  }, [loadBalance]);

  const handleCopy = () => {
    const num = treasuryAccount?.accountNumber || balanceInfo.accountNumber;
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isFrozen = treasuryAccount?.status === "FROZEN_AML";
  const posted = treasuryAccount?.postedBalance ?? balanceInfo.accountBalance;
  const available =
    treasuryAccount?.availableBalance ?? balanceInfo.accountBalance;
  const held = treasuryAccount?.heldBalance ?? 0;

  return (
    <Card className="border border-white/10 bg-[#0C1017]/90 text-white relative overflow-hidden group/card shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent" />

      <CardHeader className="border-b border-white/[0.08] pb-3">
        <CardTitle className="text-[#8E929B] text-sm md:text-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white tracking-[-0.02em]">
              Treasury Ledger Balance
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider flex items-center gap-1.5 border ${
                isFrozen
                  ? "bg-rose-500/15 text-rose-300 border-rose-500/40 animate-pulse"
                  : "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
              }`}
            >
              {isFrozen ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
              {isFrozen ? "FROZEN_AML PROTOCOL" : "ACCOUNT ACTIVE"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {allUserAccounts.length > 1 && (
              <select
                value={treasuryAccount?.id}
                onChange={(e) => {
                  const chosen = allUserAccounts.find(
                    (a) => a.id === Number(e.target.value)
                  );
                  if (chosen) setTreasuryAccount(chosen);
                }}
                className="px-2 py-0.5 bg-[#06080C] border border-white/10 text-xs text-white font-mono rounded-lg focus:outline-none"
              >
                {allUserAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Acc #{a.id} ({a.accountNumber})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setIsRevealed(!isRevealed)}
              className="p-1 hover:text-white transition-colors text-[#8E929B]"
              title={isRevealed ? "Hide balance" : "Show balance"}
            >
              {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            <button
              onClick={loadBalance}
              className={`p-1 hover:text-white transition-colors text-[#8E929B] ${isLoading ? "animate-spin text-[#38BDF8]" : ""}`}
              title="Refresh ledger balances"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Double-Entry Invariant Strip: 3 Balance Buckets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Bucket 1: Posted Balance */}
