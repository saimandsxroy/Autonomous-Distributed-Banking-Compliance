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
