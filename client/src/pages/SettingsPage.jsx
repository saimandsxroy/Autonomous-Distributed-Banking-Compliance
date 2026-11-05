import { useState, useEffect, useCallback } from "react";
import {
  User,
  Bell,
  Shield,
  Save,
  CheckCircle2,
  RefreshCw,
  Building,
  KeyRound,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  fetchProfile,
  updateProfile,
  updatePassword,
} from "../services/dashboard";
import {
  fetchUserAccounts,
  getActivePersona,
  getStoredUserProfile,
  PERSONAS,
} from "../api/treasuryApi";

export function SettingsPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activePersonaKey = getActivePersona();
  const personaMeta = PERSONAS[activePersonaKey] || PERSONAS.alice;
  const userProfile = getStoredUserProfile() || {};

  // Profile State
  const initialNames = (personaMeta.displayName || "Alice Smith").split(" ");
  const [firstName, setFirstName] = useState(initialNames[0] || "Alice");
  const [lastName, setLastName] = useState(initialNames.slice(1).join(" ") || "Smith");
  const [email, setEmail] = useState(userProfile.email || user?.email || personaMeta.email || "alice@foureyes.io");
  const [accountNumber, setAccountNumber] = useState(user?.accountNumber || "AC-4BE19A42A8DC");
  const [accountName, setAccountName] = useState(personaMeta.displayName || "Alice Smith");
  const [accountCurrency, setAccountCurrency] = useState("USD");

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [transferAlerts, setTransferAlerts] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const loadAccountAndProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch real active treasury accounts
      const accounts = await fetchUserAccounts().catch(() => []);
      if (Array.isArray(accounts) && accounts.length > 0) {
        const primary = accounts[0];
        setAccountNumber(primary.accountNumber || "AC-4BE19A42A8DC");
        setAccountCurrency(primary.currency || "USD");
      }

      // 2. Fetch user profile if account number is available
      const accNum = accounts?.[0]?.accountNumber || user?.accountNumber;
      if (accNum) {
        const profile = await fetchProfile(accNum).catch(() => null);
        if (profile) {
          if (profile.firstName) setFirstName(profile.firstName);
          if (profile.lastName) setLastName(profile.lastName);
          if (profile.email) setEmail(profile.email);
          if (profile.accountName) setAccountName(profile.accountName);
          setEmailNotifs(profile.emailNotifs ?? true);
          setLoginAlerts(profile.loginAlerts ?? true);
          setTransferAlerts(profile.transferAlerts ?? false);
        }
      }
    } catch (err) {
      console.debug("Settings live binding fallback:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.accountNumber]);

  useEffect(() => {
    loadAccountAndProfile();

    const handlePersonaChange = () => {
      const newKey = getActivePersona();
      const meta = PERSONAS[newKey] || PERSONAS.alice;
      const names = (meta.displayName || "").split(" ");
      setFirstName(names[0] || "");
      setLastName(names.slice(1).join(" ") || "");
      setEmail(meta.email || "");
      setAccountName(meta.displayName || "");
      loadAccountAndProfile();
    };

    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    window.addEventListener("runestone_persona_changed", handlePersonaChange);
    return () => {
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
    };
  }, [loadAccountAndProfile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");
    try {
      if (accountNumber) {
        await updateProfile(accountNumber, {
          firstName,
          lastName,
          email,
          emailNotifs,
          loginAlerts,
          transferAlerts,
        }).catch(() => null);
      }
      setAccountName(`${firstName} ${lastName}`);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save settings");
