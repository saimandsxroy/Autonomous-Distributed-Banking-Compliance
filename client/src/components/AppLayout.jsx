import {
  LayoutDashboard,
  Send,
  History,
  Settings,
  LogOut,
  X,
  ShieldAlert,
  Layers,
} from "lucide-react";
import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { createEventSource } from "../api/treasuryApi";
import logo from "../assets/runestone.png";

export function AppLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sseEvents, setSseEvents] = useState([]);

  React.useEffect(() => {
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
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X size={36} />
            </button>
          </div>

          <nav className="flex flex-col space-y-4 px-2 flex-1 overflow-y-auto">
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
              to="/transactions"
              icon={<History size={28} />}
              label="Transactions"
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
              to="/compliance"
              icon={<ShieldAlert size={28} />}
              label="Compliance"
              onClick={() => setMobileMenuOpen(false)}
              isMobile
            />
          </nav>

          <div className="px-2 flex flex-col space-y-4 border-t-4 border-zinc-800 pt-6 mt-4 shrink-0 pb-6">
            <SidebarLink
              to="/settings"
              icon={<Settings size={28} />}
              label="Settings"
              onClick={() => setMobileMenuOpen(false)}
              isMobile
            />
            <button
              onClick={handleLogout}
              className="flex items-center space-x-6 p-4 uppercase font-bold text-xl border-4 border-transparent transition-all group text-zinc-500 hover:bg-zinc-900 hover:text-white active:bg-zinc-800"
            >
              <span className="group-hover:text-white">
                <LogOut size={28} />
              </span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 h-full bg-zinc-950 border-r-4 border-zinc-800 flex-col justify-between py-8 shrink-0 overflow-y-auto custom-scrollbar">
        <div>
          <div className="px-8 mb-12 flex justify-center">
            <div className="relative h-24 w-24 rounded-[2rem] overflow-hidden shadow-brutal border-2 border-zinc-800 shrink-0 bg-zinc-900">
              <img
                src={logo}
                alt="RuneStone Logo"
                className="absolute inset-0 h-full w-full object-cover scale-110 pointer-events-none"
              />
            </div>
          </div>

          <nav className="flex flex-col space-y-2 px-6">
            <SidebarLink
              to="/dashboard"
              icon={<LayoutDashboard size={24} />}
              label="Dashboard"
            />
            <SidebarLink
              to="/transfer"
              icon={<Send size={24} />}
              label="Transfer"
            />
            <SidebarLink
              to="/transactions"
              icon={<History size={24} />}
              label="Transactions"
            />
            <SidebarLink
              to="/batch-fx"
              icon={<Layers size={24} />}
              label="Batch & FX"
            />
            <SidebarLink
              to="/compliance"
              icon={<ShieldAlert size={24} />}
              label="Compliance"
            />
          </nav>
        </div>

        <div className="px-6 flex flex-col space-y-3">
          <div className="pt-2 border-t-2 border-zinc-900">
            <PersonaSwitcher compact />
          </div>
          <SidebarLink
            to="/settings"
            icon={<Settings size={24} />}
            label="Settings"
          />
          <button
            onClick={handleLogout}
            className="flex items-center space-x-4 p-4 uppercase font-bold text-xl border-4 border-transparent transition-all group text-zinc-500 hover:bg-zinc-900 hover:text-white hover:border-l-zinc-700"
          >
            <span className="group-hover:text-white">
              <LogOut size={24} />
            </span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar relative">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10 pb-20 md:pb-0">
          {sseEvents.length > 0 && (
            <div className="bg-zinc-900 border-2 border-yellow-500/50 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono shadow-brutal animate-in fade-in duration-200">
              <div className="flex items-center gap-2 overflow-x-auto">
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-yellow-400 text-black font-black uppercase text-[10px] shrink-0 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                  LIVE SSE
                </span>
                <span className="text-zinc-400 font-bold">[{sseEvents[0].time}]</span>
                <span className="text-yellow-400 font-black">{sseEvents[0].type}:</span>
                <span className="text-zinc-200 truncate max-w-xl">
                  {typeof sseEvents[0].data === "object"
                    ? JSON.stringify(sseEvents[0].data)
                    : String(sseEvents[0].data)}
                </span>
              </div>
              <span className="text-zinc-500 text-[10px] shrink-0 ml-2">
                {sseEvents.length} events received
              </span>
            </div>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function SidebarLink({ to, icon, label, onClick, isMobile }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center p-4 uppercase font-bold border-4 border-transparent transition-all group
                ${isMobile ? "space-x-6 text-xl" : "space-x-4 text-xl"}
                ${
                  isActive
                    ? "bg-zinc-900 border-l-ochre-800 text-white"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-white hover:border-l-zinc-700 active:bg-zinc-800"
                }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={isActive ? "text-ochre-800" : "group-hover:text-white"}
          >
            {icon}
          </span>
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}
