import { useState, useEffect } from "react";
import {
  getActivePersona,
  setActivePersona,
  PERSONAS,
} from "../api/treasuryApi";
import { ShieldCheck, User, Users, ChevronDown } from "lucide-react";

export function PersonaSwitcher({ compact = false, onPersonaChange }) {
  const [currentPersona, setCurrentPersona] = useState(getActivePersona());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleChanged = (e) => {
      setCurrentPersona(e.detail);
    };
    window.addEventListener("runestone_persona_changed", handleChanged);
    return () => {
      window.removeEventListener("runestone_persona_changed", handleChanged);
    };
  }, []);

  const handleSelect = (p) => {
    setActivePersona(p);
    setCurrentPersona(p);
    setIsOpen(false);
    if (onPersonaChange) {
      onPersonaChange(p);
    }
  };

  const personaInfo = PERSONAS[currentPersona];
  const isOfficer = personaInfo?.role?.includes("COMPLIANCE_OFFICER");

  return (
    <div className="relative inline-block text-left w-full">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border-2 transition-all select-none ${
          isOfficer
            ? "bg-violet-950/40 border-violet-600/70 text-violet-200 hover:bg-violet-900/50"
            : "bg-zinc-900 border-zinc-700 text-zinc-200 hover:bg-zinc-800"
        } ${compact ? "px-3 py-1.5 text-xs rounded-md" : "px-4 py-3 text-sm rounded-lg shadow-brutal"}`}
      >
        <div className="flex items-center gap-3 overflow-hidden text-left">
          <div
            className={`p-1.5 rounded-md shrink-0 ${
              isOfficer ? "bg-violet-600 text-white" : "bg-ochre-800 text-white"
            }`}
          >
            {isOfficer ? (
              <ShieldCheck size={compact ? 14 : 18} />
            ) : (
              <User size={compact ? 14 : 18} />
            )}
          </div>
          <div className="truncate">
            <div className="font-bold tracking-tight truncate">
              {personaInfo?.displayName}
            </div>
            <div className="text-[10px] uppercase font-mono tracking-wider opacity-70">
              {personaInfo?.role}{" "}
              {personaInfo?.accountId ? `• Acc #${personaInfo.accountId}` : ""}
            </div>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-full min-w-[280px] bg-zinc-950 border-2 border-zinc-700 shadow-2xl rounded-lg z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800 mb-1 flex items-center justify-between">
              <span>Switch Active Actor / Persona</span>
              <Users size={12} />
            </div>

            {Object.keys(PERSONAS).map((key) => {
              const info = PERSONAS[key];
              const isSelected = key === currentPersona;
              const isLead = info.role.includes("COMPLIANCE_OFFICER");

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all text-xs ${
                    isSelected
                      ? isLead
                        ? "bg-violet-900/60 text-violet-200 border border-violet-500/50"
                        : "bg-zinc-800 text-white border border-zinc-600"
                      : "hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-md shrink-0 ${
                      isLead
                        ? "bg-violet-700 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {isLead ? <ShieldCheck size={14} /> : <User size={14} />}
                  </div>
                  <div className="flex-1 truncate">
                    <div className="font-semibold text-zinc-200 truncate">
                      {info.displayName}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {info.username} • {info.role}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
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

