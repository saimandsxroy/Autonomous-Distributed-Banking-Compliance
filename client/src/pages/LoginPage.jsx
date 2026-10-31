import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { LogIn, AlertCircle, Loader2 } from "lucide-react";
import logo from "../assets/runestone.png";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Login failed. Please check your credentials."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 select-none">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-ochre-800 opacity-[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-ochre-800 opacity-[0.03] rounded-full blur-3xl" />
      </div>

      {/* Horizontal layout container */}
      <div className="w-full max-w-5xl relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-16">
        {/* Left side — Large RuneStone branding */}
        <div className="flex-1 flex flex-col items-center md:items-start justify-center">
          <div className="relative h-40 w-40 md:h-64 md:w-64 lg:h-80 lg:w-80 rounded-[2.5rem] overflow-hidden shadow-brutal-lg border-4 border-zinc-800 bg-zinc-900 group hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all duration-300">
            <img
              src={logo}
              alt="RuneStone Bank"
              className="absolute inset-0 h-full w-full object-cover scale-110"
            />
          </div>

          <div className="mt-8 text-center md:text-left">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tighter text-white">
              RuneStone
            </h1>
            <p className="text-zinc-500 font-bold uppercase tracking-[0.3em] text-sm md:text-base mt-3">
              Bank
            </p>
          </div>
        </div>

        {/* Right side — Login form */}
        <div className="w-full md:w-[420px] shrink-0">
          <Card className="border-t-8 border-t-ochre-800 bg-zinc-900 border-x-4 border-b-4 border-x-zinc-800 border-b-zinc-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-ochre-800 opacity-[0.06] rounded-full -translate-y-16 translate-x-16 blur-2xl" />

            <CardHeader className="border-b-4 border-zinc-800 pb-4">
              <CardTitle className="text-xl md:text-2xl text-white flex items-center gap-3">
                <LogIn size={24} className="text-ochre-800" />
                Sign In
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border-4 border-red-500/30 flex items-start gap-3">
                  <AlertCircle
                    size={20}
                    className="text-red-500 shrink-0 mt-0.5"
                  />
                  <p className="text-red-400 font-bold text-sm uppercase tracking-wider">
                    {error}
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500"
                  >
                    Email Address
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="sarah@runestone.com or alice@runestone.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-mono text-base focus:border-ochre-800 transition-colors"
                    disabled={isLoading}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="text-xs md:text-sm font-bold uppercase tracking-widest text-zinc-500"
                  >
                    Password
                  </label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="password123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-zinc-950 border-4 border-zinc-800 text-white placeholder-zinc-700 font-mono text-base focus:border-ochre-800 transition-colors"
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                  />
                  <p className="text-[11px] font-mono text-zinc-500 pt-1">
                    Test password: <span className="text-ochre-400 font-bold">password123</span>
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-ochre-800 hover:bg-ochre-800/90 text-white uppercase font-black tracking-widest py-6 border-4 border-black group disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  <span className="flex items-center justify-center gap-3">
                    {isLoading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        Sign In
                        <LogIn
                          size={20}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </>
                    )}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-zinc-700 text-xs font-bold uppercase tracking-widest mt-6">
            Secure • Encrypted • Trusted
          </p>
        </div>
      </div>
    </div>
  );
}

