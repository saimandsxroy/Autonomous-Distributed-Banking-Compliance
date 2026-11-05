import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  ChevronDown,
  Check,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  getActivePersona,
  setActivePersona,
  switchDemoPersonaJwt,
  PERSONAS,
  isOfficerRole,
} from "../api/treasuryApi";

export function SidebarPersonaSwitcher({ compact = false }) {
  const [currentPersona, setCurrentPersona] = useState(getActivePersona());
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleChanged = (e) => {
      setCurrentPersona(e.detail || getActivePersona());
    };
    window.addEventListener("foureyes_persona_changed", handleChanged);
    window.addEventListener("runestone_persona_changed", handleChanged);
    return () => {
      window.removeEventListener("foureyes_persona_changed", handleChanged);
      window.removeEventListener("runestone_persona_changed", handleChanged);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = async (personaKey) => {
    if (personaKey === currentPersona && !isOpen) return;
    setIsSwitching(true);
    try {
      const data = await switchDemoPersonaJwt(personaKey);
      setActivePersona(personaKey);
      setCurrentPersona(personaKey);
      setIsOpen(false);

      // Smart routing based on role permissions
      const isOfficer = personaKey === "sarah_compliance";
      if (!isOfficer && location.pathname === "/compliance") {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Failed demo switch:", err);
    } finally {
      setIsSwitching(false);
    }
  };

  const personaInfo = PERSONAS[currentPersona] || PERSONAS.sarah_compliance;
  const isOfficer = currentPersona === "sarah_compliance";

  const getPillStyle = (key) => {
    switch (key) {
      case "alice":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "bob":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "sarah_compliance":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      case "charlie":
        return "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
      default:
        return "bg-white/10 text-white/80 border-white/20";
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Popover Switcher Menu (Opens Upward from Bottom Left) */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-3 w-[290px] sm:w-[320px] bg-[#0C1017] border border-white/[0.12] rounded-2xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 backdrop-blur-xl">
          <div className="px-2.5 py-2 border-b border-white/[0.08] mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-[#38BDF8]" />
              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#8CB0DB] font-semibold">
                Clearance Switcher
              </span>
            </div>
            <span className="font-mono text-[9px] text-[#6E737D] uppercase">
              1-Click Demo
            </span>
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-0.5">
            {Object.keys(PERSONAS).map((key) => {
              const info = PERSONAS[key];
              const isSelected = key === currentPersona;
              const pillStyle = getPillStyle(key);

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  disabled={isSwitching}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 flex items-start gap-3 group/p ${
                    isSelected
                      ? "bg-white/[0.06] border-[#38BDF8]/40 shadow-[0_0_15px_rgba(56,189,248,0.08)]"
                      : "bg-white/[0.015] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.12]"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 transition-colors ${
                      isSelected
                        ? "bg-[#38BDF8]/20 text-[#38BDF8]"
                        : "bg-white/[0.04] text-[#8E929B] group-hover/p:text-white"
                    }`}
                  >
                    {key === "sarah_compliance" ? (
                      <ShieldCheck size={15} />
                    ) : key === "bob" ? (
                      <Lock size={15} />
                    ) : (
                      <User size={15} />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[13px] font-semibold text-[#F3F1EC] group-hover/p:text-white truncate">
                        {info.displayName}
                      </span>
                      <span
                        className={`text-[9px] font-mono tracking-wider px-1.5 py-0.5 rounded border uppercase shrink-0 font-medium ${pillStyle}`}
                      >
                        {info.roleLabel || "USER"}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#7A7D82] line-clamp-1 mt-0.5 leading-tight">
                      {info.subtitle}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="self-center shrink-0">
                      <div className="w-5 h-5 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] flex items-center justify-center">
                        <Check size={12} strokeWidth={2.5} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2.5 pt-2 border-t border-white/[0.06] px-1 flex items-center justify-between text-[10px] font-mono text-[#6E737D]">
            <span>STATENESS: SHA-256 JWT</span>
            <span className="text-emerald-400">● 4-EYES COMPLIANT</span>
          </div>
        </div>
      )}

      {/* Main Trigger Card */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching}
        className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-all duration-200 select-none group/trigger text-left ${
          isOfficer
            ? "bg-[#111422]/70 border-indigo-500/30 hover:border-indigo-400/50"
            : "bg-[#0C1017] border-white/[0.08] hover:border-white/[0.18]"
        }`}
        title="Switch institutional role clearance"
      >
        <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
              isOfficer
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                : currentPersona === "alice"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : currentPersona === "bob"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                    : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
            }`}
          >
            {isOfficer ? <ShieldAlert size={15} /> : <User size={15} />}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-[#F3F1EC] truncate group-hover/trigger:text-white">
                {personaInfo.displayName}
              </span>
              <span
                className={`text-[8.5px] font-mono tracking-wider px-1 py-0.2 rounded border uppercase shrink-0 ${getPillStyle(
                  currentPersona
                )}`}
              >
                {personaInfo.roleLabel || "USER"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#7A7D82] truncate mt-0.5">
              {personaInfo.email}
            </span>
          </div>
        </div>

        <ChevronDown
          size={14}
          className={`shrink-0 text-[#7A7D82] group-hover/trigger:text-white transition-transform duration-200 ml-1.5 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
    </div>
  );
}

