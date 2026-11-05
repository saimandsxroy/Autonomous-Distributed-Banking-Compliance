import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  loginUser,
  logoutUser,
  getToken,
  getStoredAccountInfo,
  isTokenExpired,
  getTimeUntilExpiry,
} from "../services/auth";

export const AuthContext = createContext(null);

/** Compute initial auth state synchronously from localStorage */
function getInitialAuthState() {
  const storedToken = getToken();
  const storedUser = getStoredAccountInfo();

  if (storedToken && storedUser && !isTokenExpired()) {
    return { token: storedToken, user: storedUser };
  }

  // Expired or missing — clean up
  if (storedToken) {
    logoutUser();
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const expiryTimerRef = useRef(null);

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
  }, []);

  const performLogout = useCallback(() => {
    clearExpiryTimer();
    logoutUser();
    setToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [clearExpiryTimer, navigate]);

  const startExpiryTimer = useCallback(() => {
    clearExpiryTimer();
    const remaining = getTimeUntilExpiry();

    if (remaining <= 0) {
      performLogout();
      return;
    }

    expiryTimerRef.current = setTimeout(performLogout, remaining);
  }, [clearExpiryTimer, performLogout]);

  useEffect(() => {
    const initial = getInitialAuthState();
    if (initial.token) {
      setToken(initial.token);
      setUser(initial.user);
      startExpiryTimer();
    }
    setIsLoading(false);

    const handlePersonaChange = () => {
      const storedToken = getToken();
      const storedUser = getStoredAccountInfo();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    };
    window.addEventListener("foureyes_persona_changed", handlePersonaChange);
    window.addEventListener("runestone_persona_changed", handlePersonaChange);

    return () => {
      clearExpiryTimer();
      window.removeEventListener("foureyes_persona_changed", handlePersonaChange);
      window.removeEventListener("runestone_persona_changed", handlePersonaChange);
    };
  }, [clearExpiryTimer, startExpiryTimer]);

  const login = useCallback(
    async (email, password) => {
      const response = await loginUser(email, password);
      setToken(response.jwt);
      setUser(response.accountInfo);
      startExpiryTimer();
    },
    [startExpiryTimer],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        logout: performLogout,
      }}
    >
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

