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
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs font-mono shadow-[0_0_15px_rgba(244,63,94,0.1)] animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold rounded uppercase text-[10px]">
                RBAC TEST TRAP
              </span>
              <span className="text-rose-200">
                <strong>UI Guard Bypassed:</strong> Active as <strong>{activePersona}</strong> (ROLE_USER). Approving holds will trigger the live FINRA Rule 3110 <strong>403 FORBIDDEN</strong> separation-of-duties error.
              </span>
            </div>
            <button
              onClick={() => setBypassed(false)}
              className="text-xs uppercase font-medium text-rose-300 hover:text-white underline ml-4 shrink-0"
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
    <div className="max-w-2xl mx-auto my-12 animate-in zoom-in-95 duration-200">
      <div className="bg-[#0C1017]/90 border border-white/10 rounded-2xl p-7 md:p-9 backdrop-blur-xl shadow-2xl text-white relative overflow-hidden">
        {/* Subtle Crimson Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />

        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/[0.08]">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
            <Lock size={26} />
          </div>
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-rose-400 block mb-1">
              Stateless RBAC Enforcement • Route Guard
            </span>
            <h2 className="text-xl md:text-2xl font-semibold tracking-[-0.03em] text-[#F3F1EC]">
              Institutional Clearance Required
            </h2>
          </div>
        </div>

        <p className="text-[#8E929B] text-xs font-sans mb-6 leading-relaxed">
          The Sentinel AML Compliance & SRE Command Center is restricted to authorized risk officers and system administrators. Your active JWT session does not possess the required regulatory authorities.
        </p>

        {/* Identity & RBAC Matrix */}
        <div className="bg-[#06080C]/85 border border-white/[0.06] rounded-xl p-4 sm:p-5 mb-6 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05]">
            <span className="text-[#6E737D] uppercase text-[11px]">Active Session Identity:</span>
            <span className="font-semibold text-amber-300">
              {personaInfo.displayName} ({activePersona})
            </span>
          </div>
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05]">
            <span className="text-[#6E737D] uppercase text-[11px]">Granted Authorities:</span>
            <span className="text-[#9CA3AF]">
              {userRoles.join(", ") || "ROLE_USER"}
            </span>
          </div>
          <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.05]">
            <span className="text-[#6E737D] uppercase text-[11px]">Required Clearance:</span>
            <span className="text-rose-400 uppercase font-semibold">
              {requiredRole} or ROLE_ADMIN
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#6E737D] uppercase text-[11px]">Active JWT Token:</span>
            <span className="text-[#8E929B] truncate max-w-[200px] sm:max-w-xs">{truncatedJwt}</span>
          </div>
        </div>

        {/* Action Controls for Demo & Live Testing */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSwitchToOfficer}
            disabled={switching}
            className="w-full py-3.5 px-6 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-[#06080C] bg-gradient-to-r from-[#38BDF8] to-[#0284C7] hover:from-[#60A5FA] hover:to-[#2563EB] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(56,189,248,0.25)] hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2.5"
          >
            <KeyRound size={16} />
            <span>Switch Session to Sarah Connor (Compliance Officer JWT)</span>
          </button>

          <button
            type="button"
            onClick={() => setBypassed(true)}
            className="w-full py-3 px-6 rounded-xl font-mono text-xs font-medium uppercase tracking-wider text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/30 hover:border-rose-500/50 transition-all flex items-center justify-center gap-2"
          >
            <AlertTriangle size={15} />
            <span>Bypass UI Guard to Test Backend 403 Self-Approval Trap</span>
          </button>
        </div>

        <p className="text-center text-[#6E737D] text-[10px] font-mono mt-6">
          FINRA Rule 3110 / Bank Secrecy Act Supervisory Oversight Protocol
        </p>
      </div>
    </div>
  );
}

