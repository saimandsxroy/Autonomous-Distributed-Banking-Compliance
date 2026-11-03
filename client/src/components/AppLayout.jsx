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
