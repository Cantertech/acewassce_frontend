import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Phone, Lock, Eye, EyeOff, User } from "lucide-react";
import logo from "@/assets/ace_logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const Signup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  const mismatch = confirm.length > 0 && password !== confirm;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    
    setLoading(true);
    try {
      // Create a 'Shadow Email' from the phone number
      const shadowEmail = `${phone.replace(/\s/g, "")}@auth.acewassce.com`;
      
      const { data, error } = await supabase.auth.signUp({
        email: shadowEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            phone_number: `+233${phone}`,
          }
        }
      });

      if (error) throw error;

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-5 py-12 overflow-hidden">
      {/* Glow orbs */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-primary/18 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-purple-600/12 blur-[90px]" />

      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        {/* Logo */}
        <Link to="/" className="mb-8 flex items-center justify-center gap-3 group">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-soft overflow-hidden group-hover:scale-105 transition-transform">
            <img src={logo} alt="AceWassce" className="h-full w-full object-cover" />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Ace<span className="gradient-text">Wassce</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-3xl p-7 shadow-elevated sm:p-8">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">
            Create your account ✨
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Free forever. Start your first mock in under a minute.
          </p>

          <form onSubmit={onSubmit} className="mt-7 space-y-4">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Full Name
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <User className="h-4 w-4" />
                </span>
                <Input
                  id="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Kwame Mensah"
                  className="h-12 rounded-xl border-white/12 bg-white/5 pl-10 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Phone Number
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span className="text-xs font-semibold border-r border-white/15 pr-2">+233</span>
                </span>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="24 000 0000"
                  className="h-12 rounded-xl border-white/12 bg-white/5 pl-20 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary backdrop-blur-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Password
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="h-12 rounded-xl border-white/12 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary backdrop-blur-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Confirm Password
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="h-4 w-4" />
                </span>
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password"
                  className={`h-12 rounded-xl border-white/12 bg-white/5 pl-10 pr-11 text-sm text-white placeholder:text-muted-foreground/50 focus-visible:ring-2 backdrop-blur-sm transition-colors ${
                    mismatch
                      ? "border-red-500/50 focus-visible:ring-red-500"
                      : "focus-visible:ring-primary focus-visible:border-primary"
                  }`}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {mismatch && (
                <p className="text-xs text-red-400">Passwords don't match</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading || mismatch}
              className="mt-1 h-12 w-full rounded-xl bg-gradient-hero border-0 font-bold text-sm text-white shadow-glow hover:opacity-90 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Free Account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
