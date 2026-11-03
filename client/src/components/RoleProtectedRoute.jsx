import { useState, useEffect } from "react";
import { Lock, ShieldAlert, KeyRound, AlertTriangle, UserCheck, ArrowRight } from "lucide-react";
import {
  isOfficerRole,
  getUserRoles,
  getActivePersona,
  switchDemoPersonaJwt,
  getStoredJwt,
  PERSONAS,
} from "../api/treasuryApi";
import { Button } from "./ui/Button";

export function RoleProtectedRoute({ children, requiredRole = "ROLE_COMPLIANCE_OFFICER" }) {
  const [hasClearance, setHasClearance] = useState(isOfficerRole());
  const [bypassed, setBypassed] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activePersona, setActivePersonaState] = useState(getActivePersona());

  useEffect(() => {
    const handlePersonaChange = () => {
      setHasClearance(isOfficerRole());
      setActivePersonaState(getActivePersona());
      setBypassed(false); // Reset bypass on persona swap
    };

    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("runestone_persona_changed", handlePersonaChange);
  }, []);

  const handleSwitchToOfficer = async () => {
    setSwitching(true);
    try {
      await switchDemoPersonaJwt("sarah_compliance");
      setHasClearance(true);
    } catch (err) {
      console.error("Failed to switch to officer session:", err);
    } finally {
      setSwitching(false);
    }
  };

  if (hasClearance || bypassed) {
    return (
      <>
        {bypassed && (
          <div className="mb-6 p-4 bg-rose-950/70 border-4 border-rose-500 rounded-2xl flex items-center justify-between text-xs font-mono shadow-brutal animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-500 text-black font-black rounded-lg uppercase text-[10px]">
                RBAC TEST TRAP
              </span>
              <span className="text-rose-200">
                <strong>UI Guard Bypassed:</strong> Active as <strong>{activePersona}</strong> (ROLE_USER). Approving holds will trigger the live FINRA Rule 3110 <strong>403 FORBIDDEN</strong> separation-of-duties error.
              </span>
            </div>
            <button
              onClick={() => setBypassed(false)}
              className="text-xs uppercase font-bold text-zinc-400 hover:text-white underline ml-4 shrink-0"
            >
              Re-engage Guard
            </button>
          </div>
        )}
        {children}
      </>
    );
  }

  const userRoles = getUserRoles();
  const personaInfo = PERSONAS[activePersona] || { displayName: activePersona };
  const jwt = getStoredJwt();
  const truncatedJwt = jwt ? `${jwt.substring(0, 16)}...${jwt.substring(jwt.length - 12)}` : "BASIC_AUTH_FALLBACK";

  return (
    <div className="max-w-3xl mx-auto my-12 animate-in zoom-in-95 duration-200">
      <div className="bg-zinc-900 border-4 border-rose-500/80 rounded-3xl p-8 md:p-10 shadow-brutal text-white relative overflow-hidden">
        {/* Decorative corner glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none -translate-y-16 translate-x-16" />

        <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-zinc-800">
          <div className="p-4 rounded-2xl bg-rose-950 border-2 border-rose-500 text-rose-400 shrink-0">
            <Lock size={32} />
          </div>
          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-rose-400 block mb-1">
              Stateless RBAC Enforcement • Route Guard
            </span>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
              Institutional Clearance Required
            </h2>
          </div>
        </div>

        <p className="text-zinc-300 text-sm font-sans mb-6 leading-relaxed">
          The Sentinel AML Compliance & SRE Command Center is restricted to authorized risk officers and system administrators. Your active JWT session does not possess the required regulatory authorities.
        </p>

        {/* Identity & RBAC Matrix */}
        <div className="bg-zinc-950 border-2 border-zinc-800 rounded-2xl p-5 mb-8 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <span className="text-zinc-500 uppercase">Active Session Identity:</span>
            <span className="font-bold text-yellow-400">
              {personaInfo.displayName} ({activePersona})
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <span className="text-zinc-500 uppercase">Granted Authorities:</span>
            <span className="font-bold text-zinc-300">
              {userRoles.join(", ") || "ROLE_USER"}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <span className="text-zinc-500 uppercase">Required Clearance:</span>
            <span className="font-bold text-rose-400 uppercase">
              {requiredRole} or ROLE_ADMIN
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 uppercase">Active JWT Token:</span>
            <span className="text-zinc-400 truncate max-w-xs">{truncatedJwt}</span>
          </div>
        </div>

        {/* Action Controls for Demo & Live Testing */}
        <div className="space-y-3">
          <Button
            onClick={handleSwitchToOfficer}
            disabled={switching}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase text-xs md:text-sm py-4 rounded-xl shadow-brutal flex items-center justify-center gap-3 transition-all"
          >
            <KeyRound size={18} />
            🔑 Switch Session to Sarah Connor (Compliance Officer JWT)
          </Button>

          <Button
            onClick={() => setBypassed(true)}
            className="w-full bg-zinc-950 hover:bg-rose-950/40 text-rose-400 border-2 border-rose-500/50 hover:border-rose-500 font-bold uppercase text-xs py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={16} />
            🧪 Bypass UI Guard to Test Backend 403 Self-Approval Trap
          </Button>
        </div>

        <p className="text-center text-zinc-500 text-[11px] font-mono mt-6">
          FINRA Rule 3110 / Bank Secrecy Act Supervisory Oversight Protocol
        </p>
      </div>
    </div>
  );
}

