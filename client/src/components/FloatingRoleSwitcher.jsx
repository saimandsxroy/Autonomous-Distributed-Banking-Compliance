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
    return () => window.removeEventListener("runestone_persona_changed", handlePersonaChange);
  }, []);

  const handleSelectPersona = async (personaKey, portalTarget) => {
    setSwitching(true);
    try {
      const data = await switchDemoPersonaJwt(personaKey);
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
        <div className="mb-3 w-80 md:w-96 bg-zinc-950 border-4 border-zinc-800 rounded-3xl p-5 shadow-brutal text-white animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800 mb-4">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-yellow-500" />
              <span className="text-xs font-black uppercase tracking-wider">
                Instant Portal Switcher
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xs text-zinc-500 hover:text-white font-bold p-1"
            >
              ✕
            </button>
          </div>

          {/* Active Session Status */}
          <div className="p-3 bg-zinc-900 border-2 border-zinc-800 rounded-xl mb-4 text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-[10px]">Active Sub (JWT):</span>
              <span className="font-bold text-white text-[11px]">{activePersona}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-[10px]">Portal Mode:</span>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  isOfficer
                    ? "bg-rose-950 text-rose-300 border border-rose-500"
                    : "bg-emerald-950 text-emerald-300 border border-emerald-500"
                }`}
              >
                {isOfficer ? "Sentinel Compliance & SRE" : "Corporate Treasurer"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-500 uppercase text-[10px]">Authorities:</span>
              <span className="text-zinc-300 text-[10px] truncate max-w-[170px]">
                {roles.join(", ")}
              </span>
            </div>
          </div>

          {/* Quick Persona Switch Cards */}
          <div className="space-y-2 mb-4">
            {/* Alice */}
            <button
              onClick={() => handleSelectPersona("alice", "/dashboard")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                activePersona === "alice"
                  ? "bg-emerald-950/40 border-emerald-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-xs font-bold">Alice Smith (Maker)</div>
                  <div className="text-[10px] text-zinc-500">Corporate Treasurer Portal • ROLE_USER</div>
                </div>
              </div>
              {activePersona === "alice" && <Check size={16} className="text-emerald-400" />}
            </button>

            {/* Bob */}
            <button
              onClick={() => handleSelectPersona("bob", "/reconciliation")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                activePersona === "bob"
                  ? "bg-emerald-950/40 border-emerald-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-xs font-bold">Bob Jones (Checker 1)</div>
                  <div className="text-[10px] text-zinc-500">Corporate Wires Desk • ROLE_USER</div>
                </div>
              </div>
              {activePersona === "bob" && <Check size={16} className="text-emerald-400" />}
            </button>

            {/* Sarah Connor */}
            <button
              onClick={() => handleSelectPersona("sarah_compliance", "/compliance")}
              disabled={switching}
              className={`w-full p-2.5 rounded-xl border-2 text-left flex items-center justify-between transition-all ${
                activePersona === "sarah_compliance"
                  ? "bg-rose-950/50 border-rose-500 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <div>
                  <div className="text-xs font-bold">Sarah Connor (Chief Officer)</div>
                  <div className="text-[10px] text-rose-300">Sentinel AML & SRE Command Center</div>
                </div>
              </div>
              {activePersona === "sarah_compliance" && <Check size={16} className="text-rose-400" />}
            </button>
          </div>

          {/* Toggle Claims View */}
          <div className="border-t border-zinc-900 pt-3">
            <button
              onClick={() => setShowClaims(!showClaims)}
              className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold flex items-center justify-between w-full"
            >
              <span>{showClaims ? "Hide" : "Inspect"} Decoded JWT Claims</span>
              {showClaims ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>

            {showClaims && claims && (
              <pre className="mt-2 p-2.5 bg-black rounded-lg text-[9px] text-yellow-400/90 overflow-x-auto border border-zinc-800 max-h-36">
                {JSON.stringify(claims, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Floating Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border-2 shadow-brutal transition-all active:scale-95 ${
          isOfficer
            ? "bg-zinc-950 border-rose-500 text-rose-300 hover:bg-rose-950/30"
            : "bg-zinc-950 border-emerald-500 text-emerald-300 hover:bg-emerald-950/30"
        }`}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            isOfficer ? "bg-rose-500 animate-pulse" : "bg-emerald-400"
          }`}
        />
        <div className="text-left text-xs font-bold leading-tight">
          <div className="uppercase text-[9px] tracking-wider text-zinc-400">
            {isOfficer ? "Sentinel AML SRE" : "Corporate Treasurer"}
          </div>
          <div className="text-white text-[11px] truncate max-w-[130px]">
            {activePersona}
          </div>
        </div>
        <KeyRound size={16} className="text-yellow-500 shrink-0 ml-1" />
      </button>
    </div>
  );
}

