import { useState, useEffect } from "react";
import {
  getActivePersona,
  setActivePersona,
  switchDemoPersonaJwt,
  PERSONAS,
} from "../api/treasuryApi";
import { ShieldCheck, User, Users, ChevronDown, Check } from "lucide-react";

export function PersonaSwitcher({ compact = false, onPersonaChange }) {
  const [currentPersona, setCurrentPersona] = useState(getActivePersona());
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const handleChanged = (e) => {
      setCurrentPersona(e.detail);
    };
    window.addEventListener("runestone_persona_changed", handleChanged);
    window.addEventListener("foureyes_persona_changed", handleChanged);
    return () => {
      window.removeEventListener("runestone_persona_changed", handleChanged);
      window.removeEventListener("foureyes_persona_changed", handleChanged);
    };
  }, []);

  const handleSelect = async (p) => {
    setIsSwitching(true);
    try {
      await switchDemoPersonaJwt(p);
      setCurrentPersona(p);
      setIsOpen(false);
      if (onPersonaChange) {
        onPersonaChange(p);
      }
    } catch (e) {
      console.error("Persona switch error:", e);
      setActivePersona(p);
      setCurrentPersona(p);
      setIsOpen(false);
    } finally {
      setIsSwitching(false);
    }
  };

  const personaInfo = PERSONAS[currentPersona];
  const isOfficer = personaInfo?.role?.includes("COMPLIANCE_OFFICER");

  return (
    <div className="relative inline-block text-left w-full font-['Plus_Jakarta_Sans',sans-serif]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border transition-all select-none backdrop-blur-xl ${
          isOfficer
            ? "bg-violet-950/30 border-violet-500/40 text-violet-200 hover:bg-violet-900/40 hover:border-violet-500/60"
            : "bg-[#0C1017]/90 border-white/10 text-[#F3F1EC] hover:bg-[#121722] hover:border-white/20"
        } ${compact ? "px-3 py-1.5 text-xs rounded-xl" : "px-3.5 py-2.5 text-xs rounded-xl shadow-lg"}`}
      >
        <div className="flex items-center gap-2.5 overflow-hidden text-left">
          <div
            className={`p-1.5 rounded-lg shrink-0 ${
              isOfficer
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                : "bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20"
            }`}
          >
            {isOfficer ? (
              <ShieldCheck size={compact ? 13 : 15} />
            ) : (
              <User size={compact ? 13 : 15} />
            )}
          </div>
          <div className="truncate">
            <div className="font-semibold tracking-[-0.01em] text-[#F3F1EC] truncate text-xs">
              {personaInfo?.displayName}
            </div>
            <div className="text-[10px] font-mono tracking-wider text-[#6E737D] truncate">
              {personaInfo?.role}{" "}
              {personaInfo?.accountId ? `• Acc #${personaInfo.accountId}` : ""}
            </div>
          </div>
        </div>
        <ChevronDown
          size={14}
          className={`shrink-0 ml-2 text-[#8E929B] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-full min-w-[280px] bg-[#0C1017]/95 border border-white/10 shadow-2xl rounded-2xl z-50 p-2 space-y-1 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#6E737D] border-b border-white/[0.06] mb-1 flex items-center justify-between">
              <span>Switch Active Session Identity</span>
              <Users size={12} className="text-[#38BDF8]" />
            </div>

            {Object.keys(PERSONAS).map((key) => {
              const info = PERSONAS[key];
              const isSelected = key === currentPersona;
              const isLead = info.role.includes("COMPLIANCE_OFFICER");

              return (
                <button
                  key={key}
                  type="button"
                  disabled={isSwitching}
                  onClick={() => handleSelect(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs ${
                    isSelected
                      ? isLead
                        ? "bg-violet-500/15 text-violet-200 border border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                        : "bg-white/[0.08] text-white border border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                      : "hover:bg-white/[0.04] text-[#9CA3AF] hover:text-white border border-transparent"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      isLead
                        ? "bg-violet-500/20 text-violet-300"
                        : "bg-white/[0.05] text-[#8E929B]"
                    }`}
                  >
                    {isLead ? <ShieldCheck size={13} /> : <User size={13} />}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-semibold text-[#F3F1EC] truncate text-xs">
                      {info.displayName}
                    </div>
                    <div className="text-[10px] font-mono text-[#6E737D] truncate">
                      {info.username} • {info.role}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={14} className={isLead ? "text-violet-400" : "text-[#38BDF8]"} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
