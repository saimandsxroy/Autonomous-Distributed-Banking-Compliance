import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Send,
  History,
  Settings,
  LogOut,
  X,
  Menu,
  ShieldAlert,
  Layers,
  Scale,
  Lock,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Activity,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BrandLogo } from "./BrandLogo";
import { SidebarPersonaSwitcher } from "./SidebarPersonaSwitcher";
import {
  createEventSource,
  isOfficerRole,
  getActivePersona,
} from "../api/treasuryApi";

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sseEvents, setSseEvents] = useState([]);
  const [activePersona, setActivePersonaState] = useState(getActivePersona());
  const [isOfficer, setIsOfficer] = useState(isOfficerRole());

  useEffect(() => {
    const handlePersonaChange = (e) => {
      setActivePersonaState(e.detail || getActivePersona());
      setIsOfficer(isOfficerRole());
    };
    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => {
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
    };
  }, []);

  useEffect(() => {
    let eventSource;
    try {
      eventSource = createEventSource();
      const handleEvent = (type) => (e) => {
        try {
          const payload = JSON.parse(e.data);
          const item = {
            id: Date.now() + Math.random(),
            type,
            data: payload,
            time: new Date().toLocaleTimeString(),
          };
          setSseEvents((prev) => [item, ...prev].slice(0, 5));
        } catch {
          const item = {
            id: Date.now() + Math.random(),
            type,
            data: e.data,
            time: new Date().toLocaleTimeString(),
          };
          setSseEvents((prev) => [item, ...prev].slice(0, 5));
        }
      };

      eventSource.addEventListener("TRANSFER_SETTLED", handleEvent("TRANSFER_SETTLED"));
      eventSource.addEventListener("BATCH_PROGRESS", handleEvent("BATCH_PROGRESS"));
      eventSource.addEventListener("HOLD_FLAGGED", handleEvent("HOLD_FLAGGED"));
      eventSource.addEventListener("AI_DOSSIER_READY", handleEvent("AI_DOSSIER_READY"));
      eventSource.addEventListener("HITL_RESOLVED", handleEvent("HITL_RESOLVED"));
      eventSource.onmessage = handleEvent("MESSAGE");
    } catch (err) {
      console.debug("SSE stream connection skipped:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="h-screen bg-[#06080C] text-[#F3F1EC] flex flex-col md:flex-row select-none overflow-hidden relative font-['Plus_Jakarta_Sans',sans-serif]">
      {/* =====================================================================
          MOBILE HEADER
          ===================================================================== */}
      <header className="md:hidden flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-[#07090D] shrink-0 z-30">
        <BrandLogo size="sm" to="/dashboard" />

        <div className="flex items-center gap-2.5">
          <span
            className={`text-[9px] font-mono font-semibold uppercase px-2.5 py-1 rounded-full border ${
              isOfficer
                ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
            }`}
          >
            {isOfficer ? "L2+ COMPLIANCE" : "L1 MAKER/CHECKER"}
          </span>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-white/[0.04] border border-white/10 text-[#8E929B] hover:text-white"
            aria-label="Open Mobile Menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* =====================================================================
          MOBILE FULLSCREEN MENU DRAWER
          ===================================================================== */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#07090D] flex flex-col p-6 animate-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center pb-6 border-b border-white/[0.08] mb-6">
            <BrandLogo size="md" to="/dashboard" />
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white"
              aria-label="Close Menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="mb-6">
            <SidebarPersonaSwitcher />
          </div>

          <nav className="flex flex-col space-y-1.5 flex-1 overflow-y-auto">
            <SidebarNavItem
              to="/dashboard"
              icon={<LayoutDashboard size={18} />}
              label="Overview"
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/transfer"
              icon={<Send size={18} />}
              label="Initiate Transfer"
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/transactions"
              icon={<History size={18} />}
              label="Transactions Ledger"
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/batch-fx"
              icon={<Layers size={18} />}
              label="Batch Payroll & FX"
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/reconciliation"
              icon={<Scale size={18} />}
              label="Reconciliation & Nostro"
              onClick={() => setMobileMenuOpen(false)}
            />
            <SidebarNavItem
              to="/compliance"
              icon={<ShieldAlert size={18} />}
              label="AML Command Center"
              onClick={() => setMobileMenuOpen(false)}
            />
          </nav>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <SidebarNavItem
              to="/settings"
              icon={<Settings size={18} />}
              label="Settings"
              onClick={() => setMobileMenuOpen(false)}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#8E929B] hover:text-white"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          DESKTOP SIDEBAR (13px Typography, Obsidian #07090D, Hairline Border)
          ===================================================================== */}
      <aside className="hidden md:flex w-[260px] h-full bg-[#07090D] border-r border-white/[0.07] flex-col justify-between shrink-0 select-none z-20">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Top Brand Header */}
          <div className="px-6 py-6 border-b border-white/[0.06] shrink-0">
            <BrandLogo size="md" to="/dashboard" />
          </div>

          {/* Navigation Links Scroll Container */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6 custom-scrollbar">
            {/* Section 1: CORE TREASURY */}
            <div>
              <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[#6B7280] font-semibold">
                Core Treasury
              </div>
              <div className="space-y-1">
