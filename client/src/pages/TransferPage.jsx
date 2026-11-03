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

  // Standard legacy portal transfer
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
    // Re-use current locked key but alter amount by adding $1.00 to force HTTP 422 HASH_MISMATCH
    const current = parseFloat(treasuryAmount || amount || "50");
    handleTreasuryTransfer(current + 1.0);
  };

  const persona = getActivePersona();
  const personaInfo = PERSONAS[persona];

  return (
    <>
      <header className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-white">
              Transfer Funds
            </h2>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm mt-1">
              Double-Entry Treasury Ledger • Idempotency Locking • Multi-Hop AML
              Interception
            </p>
          </div>

          <div className="flex items-center gap-2 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
            <span className="text-zinc-500 uppercase">Active Actor:</span>
            <span className="font-bold text-white">
              {personaInfo.displayName}
            </span>
          </div>
        </div>
      </header>

      {/* Result feedback cards */}
      {lastJournalResult && (
        <div
          className={`mb-8 p-6 rounded-xl border-4 shadow-brutal animate-in fade-in duration-300 ${
            lastJournalResult.status === "SETTLED"
              ? "bg-emerald-950/60 border-emerald-600 text-emerald-200"
              : "bg-amber-950/70 border-amber-500 text-amber-200"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-3">
              {lastJournalResult.status === "SETTLED" ? (
                <CheckCircle2 size={24} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={24} className="text-amber-400" />
              )}
              <div>
                <span className="text-lg font-black uppercase tracking-tight">
                  Status: {lastJournalResult.status}
                </span>
                <div className="text-xs font-mono opacity-80">
                  Journal Entry #{lastJournalResult.id} • Key:{" "}
                  {lastJournalResult.idempotencyKey}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {lastJournalResult.status === "PENDING_HOLD" ? (
                <button
                  onClick={() => navigate("/compliance")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>Review in Compliance Center</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => navigate("/transactions")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center gap-1.5 transition-all"
                >
                  <span>View Verified Posting Legs</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs font-mono space-y-1">
            {lastJournalResult.riskReason && (
              <div className="p-2.5 bg-zinc-950/80 rounded border border-amber-800/80 text-amber-300">
                <span className="font-bold uppercase text-[10px] block">
                  Triggered AML Risk Reason:
                </span>
                {lastJournalResult.riskReason}
              </div>
            )}
            <div className="flex gap-6 pt-1 text-zinc-300">
              <span>
                Amount: ${lastJournalResult.amount?.toFixed(2)}{" "}
                {lastJournalResult.currency}
              </span>
              <span>Source Acc #{lastJournalResult.sourceAccountId}</span>
              <span>Dest Acc #{lastJournalResult.destinationAccountId}</span>
            </div>
          </div>
        </div>
      )}

      {rawResponseStatus && (
        <div className="mb-8 p-4 bg-rose-950/80 border-2 border-rose-600 rounded-lg text-rose-200 text-xs font-mono font-bold flex items-center gap-3">
          <AlertCircle size={20} className="text-rose-400 shrink-0" />
          <span>{rawResponseStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Standard Transfer Card */}
        <div className="lg:col-span-6 space-y-8">
          <Card className="bg-zinc-900 border-4 border-zinc-800 text-white shadow-brutal">
            <CardHeader className="border-b-4 border-zinc-800 pb-4">
              <CardTitle className="text-xl text-white flex items-center gap-3">
                <Send size={20} className="text-ochre-800" />
                <span>Account Number Transfer</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {successMessage && !lastJournalResult && (
                <div className="mb-6 p-4 bg-green-500/10 border-4 border-green-500/30 flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-green-500 shrink-0 mt-0.5"
                  />
                  <p className="text-green-400 font-bold text-sm uppercase tracking-wider">
                    {successMessage}
                  </p>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border-4 border-red-500/30 flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-red-400 font-bold text-sm uppercase tracking-wider">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleStandardTransfer} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Receiver Account
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g. 0000000000 or AC-..."
                      value={receiver}
                      onChange={(e) => {
                        setReceiver(e.target.value);
                        setResolvedName(null);
                        setError("");
                      }}
                      className="bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-mono text-base flex-1"
                      required
                    />
                    <Button
                      type="button"
                      onClick={handleLookup}
                      disabled={isLookingUp}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white border-4 border-zinc-700 shrink-0 disabled:opacity-50"
                    >
                      {isLookingUp ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <UserSearch size={18} />
                      )}
                    </Button>
                  </div>
                  {resolvedName && (
                    <p className="text-green-400 font-bold text-xs flex items-center gap-1.5 mt-1 uppercase">
                      <CheckCircle2 size={14} />
                      {resolvedName}
                    </p>
                  )}
                  {recentRecipients.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase font-mono text-zinc-500">
                        Recents:
                      </span>
                      {recentRecipients.map((rec) => (
                        <button
                          key={rec.account}
                          type="button"
                          onClick={() => {
                            setReceiver(rec.account);
                            setResolvedName(rec.name);
                          }}
                          className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-400 font-mono"
                        >
                          {rec.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Amount USD
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xl">
                      $
                    </span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-mono text-xl pl-9"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isTransferring || !resolvedName}
                  className="w-full bg-ochre-800 hover:bg-ochre-700 text-white font-black uppercase tracking-wider py-4 border-4 border-ochre-600 shadow-brutal disabled:opacity-50 text-base"
                >
                  {isTransferring ? "Settling Ledger..." : "Send Transfer"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Idempotency & AML Interception Test Controls */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="bg-zinc-900 border-4 border-zinc-800 text-white shadow-brutal">
            <CardHeader className="border-b-4 border-zinc-800 pb-4">
              <CardTitle className="text-lg text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock size={18} className="text-ochre-800" />
                  <span>Idempotency & AML Test Controls</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] font-mono">
                  Phase 2 & Phase 4 Engine
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-5">
              {/* Idempotency Key Customizer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
                    Custom Idempotency-Key
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsKeyLocked(!isKeyLocked)}
                      className={`text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded border transition-colors ${
                        isKeyLocked
                          ? "bg-amber-950 border-amber-600 text-amber-300"
                          : "bg-zinc-800 border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {isKeyLocked ? "🔒 Key Locked" : "🔓 Auto-Rotate"}
                    </button>
                    <button
                      type="button"
                      onClick={generateNewKey}
                      className="text-[10px] uppercase font-mono text-ochre-500 hover:text-white"
                    >
                      New Key
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={idempotencyKey}
                    onChange={(e) => setIdempotencyKey(e.target.value)}
                    className="bg-zinc-950 border-2 border-zinc-800 text-zinc-200 font-mono text-xs flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      navigator.clipboard.writeText(idempotencyKey)
                    }
                    className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-2 border-zinc-700 px-3"
                    title="Copy Key"
                  >
                    <Copy size={14} />
                  </Button>
                </div>
              </div>

              {/* Account selectors for double-entry test */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-mono uppercase text-zinc-500 font-bold block mb-1">
                    Source Account
                  </label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 rounded text-xs text-white font-mono focus:outline-none"
                  >
                    {(treasuryAccounts.length > 0 ? treasuryAccounts : allAccounts).map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        Account #{acc.id} ({acc.accountNumber}) — {acc.ownerName || acc.currency || "USD"} ($
                        {Number(acc.availableBalance || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-mono uppercase text-zinc-500 font-bold">
                      Destination Account
                    </label>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ID #{destAccountId}
                    </span>
                  </div>
                  <select
                    value={destAccountId}
                    onChange={(e) => setDestAccountId(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border-2 border-zinc-800 rounded text-xs text-white font-mono focus:outline-none"
                  >
                    {allAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        Account #{acc.id} ({acc.accountNumber}) — {acc.ownerName || acc.currency || "Counterparty"} ($
                        {Number(acc.availableBalance || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Custom ID:</span>
                    <input
                      type="number"
                      min="1"
                      value={destAccountId}
                      onChange={(e) => setDestAccountId(Number(e.target.value))}
                      className="w-24 px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-white font-mono focus:border-ochre-800 focus:outline-none"
                      placeholder="Acc ID"
                    />
                  </div>
                </div>
              </div>

              {/* Dedicated Amount USD input for Treasury & AML Test Controls */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase text-zinc-400 font-bold block">
                    Transfer Amount USD
                  </label>
                  <span className="text-[10px] font-mono text-zinc-500">
                    Threshold: &gt; $10,000 AML Hold
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-lg">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="50.00"
                    value={treasuryAmount}
                    onChange={(e) => setTreasuryAmount(e.target.value)}
                    className="bg-zinc-950 border-2 border-zinc-800 text-white placeholder-zinc-700 font-mono text-base pl-8 py-2 w-full focus:border-ochre-800"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] uppercase font-mono text-zinc-500">
                    Quick Presets:
                  </span>
                  <button
                    type="button"
                    onClick={() => setTreasuryAmount("50.00")}
                    className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-emerald-600 rounded text-[10px] text-emerald-400 font-mono transition-colors"
                  >
                    $50.00 (Instant Settle)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreasuryAmount("500.00")}
                    className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded text-[10px] text-zinc-300 font-mono transition-colors"
                  >
                    $500.00 (Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreasuryAmount("15000.00")}
                    className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 hover:border-amber-600 rounded text-[10px] text-amber-400 font-mono transition-colors"
                  >
                    $15,000.00 (Trigger AML Hold)
                  </button>
                </div>
              </div>

              {/* Action Buttons for Testing Invariants */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="text-[10px] font-mono uppercase text-zinc-500 font-bold">
                  Test Execution Triggers:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleTreasuryTransfer()}
                    disabled={isTransferring}
                    className="py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-2 border-zinc-700 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} />
                    <span>Execute Transfer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTamper}
                    disabled={isTransferring}
                    className="py-2.5 px-3 bg-rose-950 hover:bg-rose-900 text-rose-300 border-2 border-rose-800 rounded text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <AlertCircle size={14} />
                    <span>Test Tamper (422)</span>
                  </button>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded text-[11px] font-mono text-zinc-400 space-y-1">
                  <div className="font-bold text-zinc-300">
                    How to test idempotency & AML:
                  </div>
                  <div>
                    1. Click <b>Execute Transfer</b> with a fresh key → Settles
                    (201).
                  </div>
                  <div>
                    2. Lock Key and click <b>Execute Transfer</b> again →
                    Replays cached response (200).
                  </div>
                  <div>
                    3. Click <b>Test Tamper (422)</b> with the same key →
                    Triggers Hash Mismatch (422).
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

