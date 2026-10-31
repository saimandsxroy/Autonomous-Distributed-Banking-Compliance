import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/Card";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { transferFunds } from "../../services/dashboard";

export function QuickTransfer({ isRevealed }) {
  const { user } = useAuth();
  const [receiver, setReceiver] = useState("");
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!user?.accountNumber) return;

    setError("");
    setSuccessMessage("");
    setIsLoading(true);

    try {
      await transferFunds({
        sender: user.accountNumber,
        receiver,
        amount: parseFloat(amount),
      });

      setSuccessMessage(
        `$${parseFloat(amount).toFixed(2)} transferred successfully.`
      );
      setReceiver("");
      setAmount("");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Transfer failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-zinc-900 border-4 border-zinc-800 text-white">
      <CardHeader className="border-b-4 border-zinc-800 pb-4">
        <CardTitle className="text-xl md:text-2xl text-white">
          Quick Transfer
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border-4 border-green-500/30 flex items-start gap-2">
            <CheckCircle2
              size={16}
              className="text-green-500 shrink-0 mt-0.5"
            />
            <p
              className={`text-green-400 font-bold text-xs uppercase tracking-wider transition-all duration-300 ${!isRevealed ? "blur-sm" : ""}`}
            >
              {successMessage}
            </p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border-4 border-red-500/30 flex items-start gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-400 font-bold text-xs uppercase tracking-wider">
              {error}
            </p>
          </div>
        )}
        <form onSubmit={handleTransfer} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">
              Receiver Account
            </label>
            <Input
              type="text"
              placeholder="0000000000"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              className="bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-mono text-lg"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500">
              Amount USD
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-black text-xl">
                $
              </span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.01"
                step="0.01"
                className={`bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-black text-xl pl-10 transition-all duration-300 ${!isRevealed ? "blur-md select-none" : ""}`}
                required
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isLoading || !user?.accountNumber}
            className="w-full bg-ochre-800 hover:bg-ochre-800/90 text-white uppercase font-black tracking-widest py-6 border-4 border-black group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? "Sending..." : "Send Money"}
              {!isLoading && (
                <Send
                  size={20}
                  className="group-hover:translate-x-1 transition-transform"
                />
              )}
            </span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

