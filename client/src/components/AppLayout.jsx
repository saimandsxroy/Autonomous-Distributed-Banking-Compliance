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
                <SidebarNavItem
                  to="/dashboard"
                  icon={<LayoutDashboard size={17} />}
                  label="Overview"
                />
                <SidebarNavItem
                  to="/transfer"
                  icon={<Send size={17} />}
                  label="Transfer Funds"
                />
                <SidebarNavItem
                  to="/transactions"
                  icon={<History size={17} />}
                  label="Ledger History"
                />
                <SidebarNavItem
                  to="/batch-fx"
                  icon={<Layers size={17} />}
                  label="Batch & FX Desk"
                />
                <SidebarNavItem
                  to="/reconciliation"
                  icon={<Scale size={17} />}
                  label="Recon & Nostro"
                />
              </div>
            </div>

            {/* Section 2: GOVERNANCE & AI */}
            <div>
              <div className="px-3 mb-2 font-mono text-[10px] tracking-[0.18em] uppercase text-[#6B7280] font-semibold flex items-center justify-between">
                <span>Governance & AI</span>
                {isOfficer && (
                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    L2+
                  </span>
                )}
              </div>
              <div className="space-y-1">
                <SidebarNavItem
                  to="/compliance"
                  icon={<ShieldAlert size={17} />}
                  label="AML Command"
                  badge={
                    !isOfficer ? (
                      <Lock size={12} className="text-[#6B7280]" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                    )
                  }
                />
              </div>
            </div>
          </div>

          {/* Bottom Area: Persona Switcher, Settings, System Health */}
          <div className="p-4 border-t border-white/[0.06] bg-[#07090D]/95 space-y-3 shrink-0">
            {/* 1-Click Persona & Clearance Switcher */}
            <SidebarPersonaSwitcher />

            <div className="flex items-center justify-between pt-1">
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-[#8E929B] hover:text-white hover:bg-white/[0.04]"
                  }`
                }
              >
                <Settings size={14} />
                <span>Settings</span>
              </NavLink>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#8E929B] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Sign out of current cryptographic session"
              >
                <LogOut size={14} />
                <span>Logout</span>
              </button>
            </div>

            {/* System Invariant Status Pill */}
            <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between font-mono text-[9.5px] text-[#6B7280]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LEDGER ZERO-SUM</span>
              </span>
              <span className="text-[#8CB0DB]">0.4ms</span>
            </div>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN CONTENT VIEWPORT
          ===================================================================== */}
      <main className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#06080C]">
        {/* Subtle Ambient Radial Glow at top */}
        <div
          className="absolute top-0 left-0 right-0 h-96 pointer-events-none opacity-40 z-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% -20%, rgba(56, 189, 248, 0.15), transparent 70%)",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 py-6 md:py-8 relative z-10 space-y-6">
          {/* Top Institutional Notification Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div
                className={`px-3 py-1 rounded-full text-[10.5px] font-mono tracking-wider uppercase border flex items-center gap-2 ${
                  isOfficer
                    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOfficer ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
                  }`}
                />
                <span>
                  {isOfficer
                    ? "FOUREYES SENTINEL AML GOVERNANCE // LEVEL 2+ ACTIVE"
                    : "FOUREYES CORPORATE TREASURY // MAKER-CHECKER DESK"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-[#7A7D82]">
              <span>ACTIVE SESSION:</span>
              <span className="text-[#F3F1EC] font-semibold uppercase">
                {activePersona}
              </span>
              <span className="text-[#38BDF8]">● POSTED ON-CHAIN</span>
            </div>
          </div>

          {/* Live SSE Notification Stream Banner */}
          {sseEvents.length > 0 && (
            <div className="bg-[#0C1017] border border-amber-500/30 rounded-xl p-3 flex items-center justify-between text-xs font-mono shadow-xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5 overflow-x-auto">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold uppercase text-[10px] shrink-0 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  LIVE STREAM
                </span>
                <span className="text-[#7A7D82]">[{sseEvents[0].time}]</span>
                <span className="text-amber-400 font-bold">{sseEvents[0].type}:</span>
                <span className="text-[#E2E8F0] truncate max-w-xl">
                  {sseEvents[0].type === "HITL_RESOLVED" &&
                  typeof sseEvents[0].data === "object"
                    ? `Hold #${sseEvents[0].data.holdId || sseEvents[0].data.approvalId} ${sseEvents[0].data.decision || "APPROVED"} by ${sseEvents[0].data.reviewer}`
                    : typeof sseEvents[0].data === "object"
                      ? JSON.stringify(sseEvents[0].data)
                      : String(sseEvents[0].data)}
                </span>
              </div>
              <span className="text-[#7A7D82] text-[10px] shrink-0 ml-2">
                {sseEvents.length} events
              </span>
            </div>
          )}

          {/* Child Page Viewport */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarNavItem({ to, icon, label, badge, external = false, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group ${
          isActive
            ? "bg-gradient-to-r from-[#38BDF8]/15 via-[#38BDF8]/5 to-transparent text-white border-l-2 border-[#38BDF8] shadow-[inset_1px_0_0_rgba(56,189,248,0.5)]"
            : "text-[#8E929B] hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <span
              className={`shrink-0 transition-colors ${
                isActive
                  ? "text-[#38BDF8]"
                  : "text-[#7A7D82] group-hover:text-[#F3F1EC]"
              }`}
            >
              {icon}
            </span>
            <span className="truncate">{label}</span>
          </div>

          {badge && <span className="shrink-0">{badge}</span>}
          {external && !badge && (
            <ExternalLink
              size={12}
              className="text-[#6B7280] group-hover:text-[#8CB0DB] transition-colors"
            />
          )}
        </>
      )}
    </NavLink>
  );
}
