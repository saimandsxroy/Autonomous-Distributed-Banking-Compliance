import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogIn,
  AlertCircle,
  CheckCircle2,
  Loader2,
  KeyRound,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Lock,
  Eye,
  EyeOff,
  Coins,
  Shield,
  Layers,
  Terminal,
} from "lucide-react";
import {
  loginWithCredentials,
  switchDemoPersonaJwt,
  registerUser,
  createTreasuryAccount,
} from "../api/treasuryApi";


const CURRENCY_OPTIONS = [
  {
    code: "USD",
    amount: 5000.0,
    formatted: "$5,000.00",
    label: "US Dollar Clearing Vault",
    corridor: "Fedwire / CHIPS Real-Time Gross Settlement",
    badge: "PRIMARY CLEARING",
    badgeColor: "border-emerald-500/40 text-emerald-400 bg-emerald-500/10",
  },
  {
    code: "INR",
    amount: 400000.0,
    formatted: "₹400,000.00",
    label: "Domestic RTGS / NEFT Vault",
    corridor: "Reserve Bank of India Instant Clearing",
    badge: "DOMESTIC CORRIDOR",
    badgeColor: "border-sky-500/40 text-sky-400 bg-sky-500/10",
  },
  {
    code: "EUR",
    amount: 4500.0,
    formatted: "€4,500.00",
    label: "TARGET2 Euro Corridor",
    corridor: "Eurosystem Instant Cross-Border Clearing",
    badge: "TARGET2 CORRIDOR",
    badgeColor: "border-purple-500/40 text-purple-400 bg-purple-500/10",
  },
];

export function LoginPage() {
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  
  // Sign In State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up State
  const [signupUsername, setSignupUsername] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [selectedCurrencyIndex, setSelectedCurrencyIndex] = useState(0);

  // Shared UX State
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoggingIn, setDemoLoggingIn] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  // Handle Standard Sign In
  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setIsLoading(true);

    try {
      const data = await loginWithCredentials(identifier, password);
      if (login) {
        await login(identifier, password).catch(() => {});
      }
      navigate(data.portalTarget || "/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please verify credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Sign Up & Automatic Vault Provisioning
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    const cleanUsername = signupUsername.trim().toLowerCase();
    const cleanEmail = signupEmail.trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError("Corporate username must be at least 3 characters.");
      return;
    }
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError("Please provide a valid corporate email address.");
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setError("Master passphrase must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Register User in MySQL via Public API
      await registerUser({
        userName: cleanUsername,
        email: cleanEmail,
        password: signupPassword,
      });

      // Step 2: Mint stateless JWT for the new user
      const loginData = await loginWithCredentials(cleanUsername, signupPassword);

      // Step 3: Automatically provision initial funded Treasury Vault
      const chosenVault = CURRENCY_OPTIONS[selectedCurrencyIndex];
      await createTreasuryAccount({
        currency: chosenVault.code,
        availableBalance: chosenVault.amount,
        heldBalance: 0,
        postedBalance: chosenVault.amount,
        status: "ACTIVE",
      }).catch((accountErr) => {
        console.warn("Vault initialization note:", accountErr.message);
      });

      if (login) {
        await login(cleanUsername, signupPassword).catch(() => {});
      }

      setSuccessMsg(`Vault provisioned with ${chosenVault.formatted} (${chosenVault.code}). Directing to Treasury Terminal...`);
      setTimeout(() => {
        navigate(loginData.portalTarget || "/dashboard", { replace: true });
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration or vault provisioning failed."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 1-Click Institutional Demo Clearance
  const handleInstantDemoLogin = async (personaUsername, defaultPortal) => {
    setError("");
    setSuccessMsg("");
    setDemoLoggingIn(personaUsername);
    try {
      const data = await switchDemoPersonaJwt(personaUsername);
      if (login) {
        await login(personaUsername, "password123").catch(() => {});
      }
      navigate(defaultPortal || data.portalTarget || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Failed instant demo clearance switch.");
    } finally {
      setDemoLoggingIn(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#08090A] text-[#E8E5DE] selection:bg-[#8CB0DB] selection:text-black flex flex-col justify-between overflow-x-hidden">
      {/* =====================================================================
          ATMOSPHERIC LAYERS
          ===================================================================== */}
      {/* Radial Sapphire Backlight */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(circle at 50% 36%, rgba(140, 176, 219, 0.12) 0%, rgba(30, 58, 95, 0.05) 45%, transparent 70%)",
        }}
      />

      {/* Subtle Film Grain Overlay */}
      <div className="film-grain pointer-events-none" />

      {/* =====================================================================
          TOP MICRO-NAVIGATION CHROME BAR
          ===================================================================== */}
      <header className="relative z-30 w-full border-b border-white/10 px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex justify-between items-center backdrop-blur-md bg-[#08090A]/80">
        <Link to="/" className="flex items-center gap-3 select-none group">
          <div className="relative shrink-0 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="FourEyes Mark"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.4)] transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-[-0.03em] text-[#F3F1EC] group-hover:text-white transition-colors font-['Plus_Jakarta_Sans',sans-serif] text-sm sm:text-base">
                Four<span className="text-[#38BDF8]">Eyes</span>
              </span>
              <span className="font-mono text-[9px] tracking-[0.16em] uppercase text-[#8CB0DB] bg-white/[0.04] border border-white/10 px-1.5 py-0.5 rounded leading-none">
                CORE
              </span>
            </div>
            <span className="font-mono text-[8px] sm:text-[8.5px] tracking-[0.2em] text-[#6E737D] uppercase leading-none mt-0.5">
              AUTONOMOUS BANKING
            </span>
          </div>
        </Link>

        <Link
          to="/"
          className="group inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-tech-mono tracking-[0.16em] text-[#8CB0DB] hover:text-white uppercase transition-colors"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-1" />
          <span>Return to 3D Architecture</span>
        </Link>
      </header>

      {/* =====================================================================
          MAIN SPLIT STAGE: Responsive Flex Layout (Stack on Mobile, Row on Desktop)
          ===================================================================== */}
      <main className="relative z-20 flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-12 my-auto">
        {/* =================================================================
            LEFT COLUMN: IDENTITY & 1-CLICK DEMO CLEARANCE
            ================================================================= */}
        <div className="w-full lg:flex-1 flex flex-col justify-center select-none">
          {/* Eyebrow Pill */}
          <div className="institutional-glass-badge inline-flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-tech-mono tracking-[0.2em] text-[#E2E8F0] uppercase mb-4 sm:mb-6 w-fit">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse shadow-[0_0_8px_#38BDF8]" />
            <span>STATELESS JWT & RBAC CLEARANCE GATE</span>
          </div>

          {/* Luxury Display Heading */}
          <h1 className="font-display-sans text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-white mb-3 sm:mb-4 leading-[1.08]">
            Cryptographic access.
            <br />
            <span className="font-editorial-serif italic font-normal text-[#38BDF8]">
              Role-isolated
            </span>{" "}
            portals.
          </h1>

          {/* Subheading */}
          <p className="font-hero-sub text-xs sm:text-sm text-[#A1A4A8] max-w-lg mb-6 sm:mb-8 leading-relaxed">
            Stateless HMAC-SHA256 tokens enforcing FINRA 3110 four-eyes separation and autonomous AML graph inspection across corporate treasury, recon desks, and SRE security vaults.
          </p>

          {/* Instant Preview Sandbox Header & Minimalist Persona Tiles */}
          <div className="w-full space-y-3 max-w-xl">
            <div className="flex items-center gap-2 pb-1">
              <span className="text-[11px] font-tech-mono font-semibold uppercase tracking-[0.2em] text-[#8CB0DB]">
                ⚡ INSTANT PREVIEW SANDBOX
              </span>
            </div>

            {/* Alice Smith Card */}
            <button
              type="button"
              onClick={() => handleInstantDemoLogin("alice", "/dashboard")}
              disabled={!!demoLoggingIn || isLoading}
              className="w-full text-left p-4 lg:p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#38BDF8]/30 transition-all duration-300 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                  <UserCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <span className="text-sm font-medium text-white group-hover:text-emerald-300 transition-colors">
                      Alice Smith
                    </span>
                    <span className="text-[9px] font-tech-mono font-medium px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">
                      MAKER
                    </span>
                  </div>
                  <p className="text-xs text-[#8E9299] mt-0.5 font-hero-sub break-words">
                    Execute transfers &amp; batch payroll.
                  </p>
                </div>
              </div>
              <div className="flex items-center pl-2 sm:pl-3 shrink-0">
                {demoLoggingIn === "alice" ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-tech-mono text-emerald-400">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="hidden sm:inline">Authenticating...</span>
                  </div>
                ) : (
                  <ArrowRight
                    size={16}
                    className="text-[#6E737D] group-hover:text-[#38BDF8] group-hover:translate-x-1 transition-all"
                  />
                )}
              </div>
            </button>

            {/* Bob Jones Card */}
            <button
              type="button"
              onClick={() => handleInstantDemoLogin("bob", "/reconciliation")}
              disabled={!!demoLoggingIn || isLoading}
              className="w-full text-left p-4 lg:p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#38BDF8]/30 transition-all duration-300 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <span className="text-sm font-medium text-white group-hover:text-amber-300 transition-colors">
                      Bob Jones
                    </span>
                    <span className="text-[9px] font-tech-mono font-medium px-2 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-400 uppercase tracking-wider">
                      CHECKER
                    </span>
                  </div>
                  <p className="text-xs text-[#8E9299] mt-0.5 font-hero-sub break-words">
                    Dual-control approvals &amp; reconciliation.
                  </p>
                </div>
              </div>
              <div className="flex items-center pl-2 sm:pl-3 shrink-0">
                {demoLoggingIn === "bob" ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-tech-mono text-amber-400">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="hidden sm:inline">Authenticating...</span>
                  </div>
                ) : (
                  <ArrowRight
                    size={16}
                    className="text-[#6E737D] group-hover:text-[#38BDF8] group-hover:translate-x-1 transition-all"
                  />
                )}
              </div>
            </button>

            {/* Sarah Connor Card */}
            <button
              type="button"
              onClick={() => handleInstantDemoLogin("sarah_compliance", "/compliance")}
              disabled={!!demoLoggingIn || isLoading}
              className="w-full text-left p-4 lg:p-5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#38BDF8]/30 transition-all duration-300 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="p-2 sm:p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                  <KeyRound size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors">
                      Sarah Connor
                    </span>
                    <span className="text-[9px] font-tech-mono font-medium px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 uppercase tracking-wider">
                      COMPLIANCE
                    </span>
                  </div>
                  <p className="text-xs text-[#8E9299] mt-0.5 font-hero-sub break-words">
                    AI investigation &amp; AML graph analysis.
                  </p>
                </div>
              </div>
              <div className="flex items-center pl-2 sm:pl-3 shrink-0">
                {demoLoggingIn === "sarah_compliance" ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-tech-mono text-indigo-400">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="hidden sm:inline">Authenticating...</span>
                  </div>
                ) : (
                  <ArrowRight
                    size={16}
                    className="text-[#6E737D] group-hover:text-[#38BDF8] group-hover:translate-x-1 transition-all"
                  />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* =================================================================
            RIGHT COLUMN: GLASSMORPHIC CRYPTOGRAPHIC AUTH TERMINAL
            ================================================================= */}
        <div className="w-full lg:max-w-md mx-auto shrink-0">
          <div className="relative rounded-2xl bg-[#0B0E13]/90 backdrop-blur-xl border border-white/12 p-5 sm:p-7 lg:p-8 shadow-2xl overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent">
            {/* Ambient Sapphire Glow in Corner */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#38BDF8]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Mode Switcher Tabs */}
            <div className="relative grid grid-cols-2 p-1 rounded-xl bg-white/[0.03] border border-white/10 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`min-h-[44px] py-2.5 text-xs font-tech-mono tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === "signin"
                    ? "bg-white/[0.08] text-white shadow-sm border border-white/15"
                    : "text-[#7A7D82] hover:text-[#C5C8CD]"
                }`}
              >
                <LogIn size={14} className={authMode === "signin" ? "text-[#38BDF8]" : ""} />
                <span>[01] Sign In</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                  setSuccessMsg("");
                }}
                className={`min-h-[44px] py-2.5 text-xs font-tech-mono tracking-wider uppercase rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === "signup"
                    ? "bg-white/[0.08] text-white shadow-sm border border-white/15"
                    : "text-[#7A7D82] hover:text-[#C5C8CD]"
                }`}
              >
                <Coins size={14} className={authMode === "signup" ? "text-emerald-400" : ""} />
                <span>[02] Create Account</span>
              </button>
            </div>

            {/* Error Notification Banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-300 flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs font-tech-mono leading-relaxed">{error}</p>
              </div>
            )}

            {/* Success Notification Banner */}
            {successMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs font-tech-mono leading-relaxed">{successMsg}</p>
              </div>
            )}

            {/* =============================================================
                MODE A: SIGN IN FORM
                ============================================================= */}
            {authMode === "signin" && (
              <form onSubmit={handleSignIn} className="space-y-4">
                {/* Identifier */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signin-identifier"
                    className="text-[11px] font-tech-mono uppercase tracking-wider text-[#A1A4A8]"
                  >
                    Identifier
                  </label>
                  <div className="relative">
                    <input
                      id="signin-identifier"
                      type="text"
                      autoComplete="username"
                      placeholder="sarah_compliance or alice"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full bg-[#08090A] border border-white/10 rounded-xl px-4 py-3 min-h-[44px] text-sm text-[#F3F1EC] placeholder:text-[#45474D] font-tech-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-all"
                    />
                  </div>
                </div>

                {/* Master Passphrase with Toggle */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="signin-password"
                    className="text-[11px] font-tech-mono uppercase tracking-wider text-[#A1A4A8]"
                  >
                    Master Passphrase
                  </label>
                  <div className="relative">
                    <input
                      id="signin-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full bg-[#08090A] border border-white/10 rounded-xl px-4 py-3 min-h-[44px] pr-12 text-sm text-[#F3F1EC] placeholder:text-[#45474D] font-tech-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#7A7D82] hover:text-[#F3F1EC] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-6 min-h-[44px] rounded-xl font-tech-mono text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 bg-[#E8E5DE] text-[#08090A] hover:bg-white hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Minting Stateless JWT...</span>
                    </>
                  ) : (
                    <>
                      <span>Authenticate &amp; Enter Portal</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* =============================================================
                MODE B: SIGN UP FORM & TREASURY VAULT PROVISIONING
                ============================================================= */}
            {authMode === "signup" && (
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Username */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-username"
                    className="text-[11px] font-tech-mono uppercase tracking-wider text-[#A1A4A8]"
                  >
                    Corporate Username
                  </label>
                  <input
                    id="signup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. david_treasurer"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full bg-[#08090A] border border-white/10 rounded-xl px-4 py-2.5 min-h-[44px] text-sm text-[#F3F1EC] placeholder:text-[#45474D] font-tech-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-all"
                  />
                </div>

                {/* Corporate Email */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-email"
                    className="text-[11px] font-tech-mono uppercase tracking-wider text-[#A1A4A8]"
                  >
                    Corporate Work Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="david@foureyes.io"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full bg-[#08090A] border border-white/10 rounded-xl px-4 py-2.5 min-h-[44px] text-sm text-[#F3F1EC] placeholder:text-[#45474D] font-tech-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-all"
                  />
                </div>

                {/* Passphrase with Toggle */}
                <div className="space-y-1">
                  <label
                    htmlFor="signup-password"
                    className="text-[11px] font-tech-mono uppercase tracking-wider text-[#A1A4A8]"
                  >
                    Master Passphrase
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      className="w-full bg-[#08090A] border border-white/10 rounded-xl px-4 py-2.5 min-h-[44px] pr-12 text-sm text-[#F3F1EC] placeholder:text-[#45474D] font-tech-mono focus:outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      tabIndex={-1}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[#7A7D82] hover:text-[#F3F1EC] transition-colors cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Initial Treasury Vault & Liquidity Selector */}
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center text-[11px] font-tech-mono uppercase tracking-wider">
                    <span className="text-[#A1A4A8]">Initial Treasury Vault &amp; Liquidity</span>
                    <span className="text-emerald-400 font-semibold">PRE-FUNDED</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {CURRENCY_OPTIONS.map((opt, idx) => {
                      const isSelected = selectedCurrencyIndex === idx;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setSelectedCurrencyIndex(idx)}
                          className={`text-left p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white/[0.08] border-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.2)]"
                              : "bg-[#08090A] border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-tech-mono font-bold text-white">
                              {opt.code}
                            </span>
                            <span
                              className={`text-[9px] font-tech-mono px-1.5 py-0.2 rounded border ${opt.badgeColor}`}
                            >
                              {opt.code}
                            </span>
                          </div>
                          <div className="text-sm font-tech-mono font-semibold text-emerald-400">
                            {opt.formatted}
                          </div>
                          <div className="text-[10px] text-[#7A7D82] line-clamp-1 mt-0.5">
                            {opt.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Provision & Mint Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-6 min-h-[44px] rounded-xl font-tech-mono text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2 bg-[#E8E5DE] text-[#08090A] hover:bg-white hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Provisioning Treasury Ledger...</span>
                    </>
                  ) : (
                    <>
                      <span>Provision Vault &amp; Mint Identity</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Micro Terminal Footer Telemetry */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-[10px] font-tech-mono text-[#7A7D82]">
              <span className="flex items-center gap-1.5">
                <Shield size={12} className="text-[#38BDF8]" />
                <span>HMAC-SHA256 • ZERO-SUM LEDGER</span>
              </span>
              <span>PORT: 8081</span>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          BOTTOM 4-COLUMN SECURITY SPECIFICATION BAR
          ===================================================================== */}
      <footer className="relative z-20 w-full border-t border-white/10 py-6 sm:py-8 px-4 sm:px-8 lg:px-12 bg-[#08090A]/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
          {/* Spec 1 */}
          <div className="space-y-1">
            <div className="text-[11px] font-tech-mono font-semibold uppercase tracking-wider text-[#38BDF8]">
              HMAC-SHA256
            </div>
            <div className="text-xs font-tech-mono text-white font-medium">
              STATELESS BEARER JWT
            </div>
            <p className="text-[11px] text-[#7A7D82] leading-relaxed">
              Sub-millisecond token verification, zero vulnerable server session memory.
            </p>
          </div>

          {/* Spec 2 */}
          <div className="space-y-1">
            <div className="text-[11px] font-tech-mono font-semibold uppercase tracking-wider text-emerald-400">
              BCRYPT-10
            </div>
            <div className="text-xs font-tech-mono text-white font-medium">
              SALTED PASSWORD HASHING
            </div>
            <p className="text-[11px] text-[#7A7D82] leading-relaxed">
              FIPS-grade cryptographic key derivation with adaptive work-factor salting.
            </p>
          </div>

          {/* Spec 3 */}
          <div className="space-y-1">
            <div className="text-[11px] font-tech-mono font-semibold uppercase tracking-wider text-sky-400">
              FINRA 3110
            </div>
            <div className="text-xs font-tech-mono text-white font-medium">
              4-EYES SEPARATION GUARD
            </div>
            <p className="text-[11px] text-[#7A7D82] leading-relaxed">
              Mandatory dual-control Maker-Checker quarantine on outbound disbursements.
            </p>
          </div>

          {/* Spec 4 */}
          <div className="space-y-1">
            <div className="text-[11px] font-tech-mono font-semibold uppercase tracking-wider text-rose-400">
              SHA-256 CHAIN
            </div>
            <div className="text-xs font-tech-mono text-white font-medium">
              IMMUTABLE AUDIT LOGS
            </div>
            <p className="text-[11px] text-[#7A7D82] leading-relaxed">
              Cryptographically chained forensic trails guaranteeing non-repudiation.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default LoginPage;
