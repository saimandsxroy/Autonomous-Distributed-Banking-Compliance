import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { FileText, Calendar, X, ArrowRight, ShieldCheck, Clock } from "lucide-react";
import { playButtonClickSound, playButtonHoverSound } from "../../utils/soundEngine";

export function StatementRequestModal({ onClose, onSubmit }) {
  const todayStr = () => new Date().toISOString().split("T")[0];
  const daysAgoStr = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState(() => daysAgoStr(30));
  const [endDate, setEndDate] = useState(() => todayStr());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const setPresetRange = (days) => {
    playButtonClickSound();
    setEndDate(todayStr());
    setStartDate(daysAgoStr(days));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.accountNumber) return;
    playButtonClickSound();
    setIsSubmitting(true);
    try {
      await onSubmit(startDate, endDate);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-[#0C1017]/95 border border-white/10 rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl relative overflow-hidden text-white backdrop-blur-2xl animate-in zoom-in-95 duration-200">
        {/* Subtle Ambient Laser Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent" />

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/[0.08] mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/25 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.15)]">
              <FileText size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-[#38BDF8] block mb-0.5">
                Institutional Ledger Service
              </span>
              <h3 className="text-lg sm:text-xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
                Request Statement
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              playButtonClickSound();
              onClose();
            }}
            className="p-1.5 rounded-lg text-[#6E737D] hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Close dialog"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[#8E929B] text-xs font-sans mb-4 leading-relaxed">
          Generate an authenticated double-entry account statement. Postings within the selected window will be compiled and verified against the immutable journal hash chain.
        </p>

        {/* Quick Range Presets */}
        <div className="mb-4">
          <label className="text-[10px] font-mono uppercase tracking-wider text-[#7A7D82] mb-1.5 flex items-center gap-1">
            <Clock size={11} className="text-[#38BDF8]" />
            <span>Quick Range Presets</span>
          </label>
