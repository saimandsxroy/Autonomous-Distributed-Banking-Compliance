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
import logo from "../assets/runestone.png";

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
