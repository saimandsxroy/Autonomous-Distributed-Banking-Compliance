import { useState, useEffect } from "react";
import {
  ShieldAlert,
  KeyRound,
  UserCheck,
  ChevronUp,
  ChevronDown,
  Building,
  ShieldCheck,
  Zap,
  Check,
  Sparkles,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getActivePersona,
  switchDemoPersonaJwt,
  getStoredUserProfile,
  getDecodedJwtClaims,
  getUserRoles,
  PERSONAS,
} from "../api/treasuryApi";

export function FloatingRoleSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePersona, setActivePersonaState] = useState(getActivePersona());
  const [switching, setSwitching] = useState(false);
  const [showClaims, setShowClaims] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handlePersonaChange = (e) => {
      setActivePersonaState(e.detail || getActivePersona());
    };
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    return () => {
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
    };
  }, []);

  const handleSelectPersona = async (personaKey, portalTarget) => {
    setSwitching(true);
    try {
      await switchDemoPersonaJwt(personaKey);
      setActivePersonaState(personaKey);
      if (portalTarget) {
        navigate(portalTarget);
      }
    } catch (err) {
      console.error("Failed demo switch:", err);
    } finally {
      setSwitching(false);
    }
  };

  const isOfficer = activePersona === "sarah_compliance";
  const claims = getDecodedJwtClaims();
  const roles = getUserRoles();

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono select-none">
      {/* Expanded Control Drawer */}
      {isOpen && (
        <div className="mb-3 w-80 md:w-96 bg-[#0C1017]/95 border border-white/10 rounded-2xl p-5 shadow-2xl text-white backdrop-blur-2xl relative overflow-hidden animate-in slide-in-from-bottom-3 duration-200">
          {/* Subtle Ambient Laser Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#38BDF8]/60 to-transparent" />

          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex items-center justify-center">
                <Zap size={13} />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F3F1EC]">
                Instant Persona Switcher
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#6E737D] hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              title="Close switcher"
            >
              <X size={14} />
            </button>
          </div>

          {/* Active Session Status */}
          <div className="p-3 bg-[#06080C]/80 border border-white/[0.06] rounded-xl mb-3.5 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[#6E737D] uppercase text-[10px]">Active Sub (JWT):</span>
              <span className="font-semibold text-[#38BDF8] text-[11px]">{activePersona}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6E737D] uppercase text-[10px]">Portal Mode:</span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md border ${
                  isOfficer
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                }`}
              >
                {isOfficer ? "Sentinel Compliance & SRE" : "Corporate Treasurer"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#6E737D] uppercase text-[10px]">Authorities:</span>
              <span className="text-[#9CA3AF] text-[10px] truncate max-w-[170px]">
                {roles.join(", ")}
              </span>
            </div>
          </div>

          {/* Quick Persona Switch Cards */}
          <div className="space-y-2 mb-3.5">
            {/* Alice */}
            <button
              onClick={() => handleSelectPersona("alice", "/dashboard")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                activePersona === "alice"
                  ? "bg-white/[0.06] border-emerald-500/50 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "bg-white/[0.02] border-white/[0.06] text-[#9CA3AF] hover:border-white/20 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-xs font-semibold">Alice Smith (Maker)</div>
                  <div className="text-[10px] text-[#6E737D]">Corporate Treasurer Portal • ROLE_USER</div>
                </div>
              </div>
              {activePersona === "alice" && <Check size={14} className="text-emerald-400" />}
            </button>

            {/* Bob */}
            <button
              onClick={() => handleSelectPersona("bob", "/reconciliation")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                activePersona === "bob"
                  ? "bg-white/[0.06] border-[#38BDF8]/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.1)]"
                  : "bg-white/[0.02] border-white/[0.06] text-[#9CA3AF] hover:border-white/20 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                <div>
                  <div className="text-xs font-semibold">Bob Jones (Checker 1)</div>
                  <div className="text-[10px] text-[#6E737D]">Corporate Wires Desk • ROLE_USER</div>
                </div>
              </div>
              {activePersona === "bob" && <Check size={14} className="text-[#38BDF8]" />}
            </button>

            {/* Sarah Connor */}
            <button
              onClick={() => handleSelectPersona("sarah_compliance", "/compliance")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                activePersona === "sarah_compliance"
                  ? "bg-white/[0.06] border-rose-500/50 text-white shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                  : "bg-white/[0.02] border-white/[0.06] text-[#9CA3AF] hover:border-white/20 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <div>
                  <div className="text-xs font-semibold">Sarah Connor (Chief Officer)</div>
                  <div className="text-[10px] text-rose-300">Sentinel AML & SRE Command Center</div>
                </div>
              </div>
              {activePersona === "sarah_compliance" && <Check size={14} className="text-rose-400" />}
            </button>
          </div>

          {/* Toggle Claims View */}
          <div className="border-t border-white/[0.08] pt-3">
            <button
              onClick={() => setShowClaims(!showClaims)}
              className="text-[10px] text-[#6E737D] hover:text-white uppercase font-semibold flex items-center justify-between w-full transition-colors"
            >
              <span>{showClaims ? "Hide" : "Inspect"} Decoded JWT Claims</span>
              {showClaims ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {showClaims && claims && (
              <pre className="mt-2 p-2.5 bg-[#06080C] rounded-xl text-[9px] text-[#38BDF8]/90 overflow-x-auto border border-white/[0.06] max-h-36">
                {JSON.stringify(claims, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-3.5 py-2 rounded-2xl border transition-all active:scale-95 shadow-xl backdrop-blur-xl ${
          isOfficer
            ? "bg-[#0C1017]/90 border-rose-500/40 text-rose-300 hover:bg-[#121722] hover:border-rose-500/60"
            : "bg-[#0C1017]/90 border-white/10 text-[#F3F1EC] hover:bg-[#121722] hover:border-[#38BDF8]/40"
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isOfficer ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
          }`}
        />
        <div className="text-left text-xs font-medium leading-tight">
          <div className="uppercase text-[9px] tracking-wider text-[#6E737D]">
            {isOfficer ? "Sentinel AML SRE" : "Corporate Treasury"}
          </div>
          <div className="text-[#F3F1EC] font-semibold text-[11px] truncate max-w-[130px]">
            {activePersona}
          </div>
        </div>
        <KeyRound size={14} className="text-[#38BDF8] shrink-0 ml-1" />
      </button>
    </div>
  );
}
