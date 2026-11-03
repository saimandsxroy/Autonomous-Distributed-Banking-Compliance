import {
  LayoutDashboard,
  Send,
  History,
  Settings,
  LogOut,
  X,
  ShieldAlert,
  Layers,
  Scale,
  Lock,
  Building,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { FloatingRoleSwitcher } from "./FloatingRoleSwitcher";
import {
  createEventSource,
  isOfficerRole,
  getActivePersona,
  PERSONAS,
} from "../api/treasuryApi";
import logo from "../assets/runestone.png";

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
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => window.removeEventListener("runestone_persona_changed", handlePersonaChange);
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
    <div className="h-screen bg-zinc-950 text-white flex flex-col md:flex-row select-none overflow-hidden relative">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-6 border-b-4 border-zinc-800 shrink-0 select-none">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="relative h-14 w-14 rounded-[1.2rem] overflow-hidden shadow-brutal border-2 border-zinc-800 shrink-0 bg-zinc-900 transition-transform active:scale-95 focus:outline-none"
          aria-label="Open Mobile Menu"
        >
          <img
            src={logo}
            alt="RuneStone Logo"
            className="absolute inset-0 h-full w-full object-cover scale-110 pointer-events-none"
          />
        </button>

        {/* Mobile Portal Indicator */}
        <span
          className={`text-[10px] font-mono font-bold uppercase px-3 py-1 rounded-full border ${
            isOfficer
              ? "bg-rose-950 text-rose-300 border-rose-500"
              : "bg-emerald-950 text-emerald-300 border-emerald-500"
          }`}
        >
          {isOfficer ? "Sentinel AML SRE" : "Corporate Portal"}
        </span>
      </header>

      {/* Fullscreen Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-zinc-950 flex flex-col py-6 px-4 animate-in slide-in-from-bottom-8 duration-200">
          <div className="flex justify-between items-center mb-12 px-2">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="relative h-14 w-14 rounded-[1.2rem] overflow-hidden shadow-brutal border-2 border-zinc-800 shrink-0 bg-zinc-900 transition-transform active:scale-95 focus:outline-none"
              aria-label="Close Mobile Menu"
            >
              <img
                src={logo}
                alt="RuneStone Logo"
                className="absolute inset-0 h-full w-full object-cover scale-110 pointer-events-none"
              />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 border-4 border-zinc-800 bg-zinc-900 text-white active:bg-zinc-800"
              aria-label="Close Menu"
            >
              <X size={28} />
            </button>
          </div>

          <nav className="flex flex-col space-y-3 px-2 flex-1 overflow-y-auto">
            {isOfficer ? (
              <>
                <SidebarLink
                  to="/compliance"
                  icon={<ShieldAlert size={28} />}
                  label="AML Command Center"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
                  to="/reconciliation"
                  icon={<Scale size={28} />}
                  label="Recon & Wires"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
                  to="/batch-fx"
                  icon={<Layers size={28} />}
                  label="Batch & FX"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
                  to="/transactions"
                  icon={<History size={28} />}
                  label="Transactions"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
                  to="/dashboard"
                  icon={<LayoutDashboard size={28} />}
                  label="Dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
              </>
            ) : (
              <>
                <SidebarLink
                  to="/dashboard"
                  icon={<LayoutDashboard size={28} />}
                  label="Dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
                  to="/transfer"
                  icon={<Send size={28} />}
                  label="Transfer"
                  onClick={() => setMobileMenuOpen(false)}
                  isMobile
                />
                <SidebarLink
