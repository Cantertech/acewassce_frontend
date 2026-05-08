import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Coins, 
  Sparkles, 
  CreditCard, 
  Loader2, 
  HelpCircle,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://acewassce-backend.onrender.com";

const PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    points: 50,
    amount: 5,
    tag: "Popular",
    desc: "Good for 5 full mock trials",
    bonus: null,
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/25 shadow-blue-500/5",
    text_color: "text-blue-400",
    badge: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  },
  {
    id: "standard",
    name: "Standard Pack",
    points: 110,
    amount: 10,
    tag: "Best Value",
    desc: "Good for 11 full mock trials",
    bonus: "+10 Bonus Points!",
    color: "from-purple-500/20 to-purple-600/5 border-purple-500/30 shadow-purple-500/5",
    text_color: "text-purple-400",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse"
  },
  {
    id: "pro",
    name: "Pro Pack",
    points: 240,
    amount: 20,
    tag: "Ultimate Value",
    desc: "Good for 24 full mock trials",
    bonus: "+40 Bonus Points!",
    color: "from-rose-500/20 to-rose-600/5 border-rose-500/25 shadow-rose-500/5",
    text_color: "text-rose-400",
    badge: "bg-rose-500/20 text-rose-400 border-rose-500/30"
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("standard");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    fetchWalletBalance();
    const savedRef = localStorage.getItem("pending_payment_ref");
    if (savedRef) {
      setPaymentRef(savedRef);
    }
  }, []);

  const fetchWalletBalance = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(`${backendUrl}/api/v1/payments/wallet/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setWalletPoints(data.wallet_points);
      }
    } catch (err) {
      console.error("Wallet balance fetch error:", err);
    }
  };

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to purchase points");
        navigate("/login");
        return;
      }

      const res = await fetch(`${backendUrl}/api/v1/payments/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_id: user.id,
          package_id: packageId
        })
      });

      if (!res.ok) {
        throw new Error("Failed to initialize payment with backend");
      }

      const data = await res.json();
      if (data.status === "success" && data.authorization_url) {
        localStorage.setItem("pending_payment_ref", data.reference);
        toast.success("Opening secure checkout portal...");
        setTimeout(() => {
          window.location.href = data.authorization_url;
        }, 1000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize checkout.");
    } finally {
      setLoading(false);
    }
  };

  const verifyPaymentReference = async (refToVerify: string) => {
    try {
      setCheckingPayment(true);
      const res = await fetch(`${backendUrl}/api/v1/payments/verify/${refToVerify}`);
      const data = await res.json();
      
      if (data.status === "success") {
        toast.success(data.message || "Top-up verified successfully!");
        localStorage.removeItem("pending_payment_ref");
        setPaymentRef(null);
        fetchWalletBalance();
      } else {
        toast.error(data.message || "Payment verification failed or is pending.");
      }
    } catch (err) {
      toast.error("Network verification failed. Please try again.");
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* ── BACKGROUND FLOWING GRADIENT BLOCKS ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute top-[5%] -left-[10%] h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-purple-600/5 blur-[120px]" />
      </div>

      {/* ── TOP HEADER NAVBAR ── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-3xl items-center px-4 mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-white transition-all mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest font-display">A1 Preps Subscription</span>
            <h1 className="font-display text-sm font-extrabold text-white">Pricing & Top-Up</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-3xl mx-auto mt-6 animate-fade-up">
        
        {/* WALLET METRICS BOARD */}
        <section className="glass-card rounded-3xl border border-white/10 p-6 bg-gradient-to-tr from-white/5 via-white/5 to-amber-500/5 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-glow shrink-0">
              <Coins className="h-7 w-7" />
            </div>
            <div>
              <h2 className="font-display text-xl font-black text-white">Points Balance</h2>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Purchase wallet points to take full-length mock exams. <b>10 Points = 1 Exam Attempt.</b>
              </p>
            </div>
          </div>
          
          <div className="bg-black/40 border border-white/5 rounded-2xl px-6 py-4 text-center sm:text-right shrink-0 w-full sm:w-auto">
            <span className="text-3xl font-display font-black text-amber-400 tracking-tight">
              {walletPoints !== null ? walletPoints : <Loader2 className="h-6 w-6 animate-spin inline-block text-amber-400" />}
            </span>
            <span className="text-xs font-bold text-muted-foreground/80 ml-1.5 uppercase">Points</span>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-bold">
              ~ {walletPoints !== null ? Math.floor(walletPoints / 10) : 0} Exams Remaining
            </p>
          </div>
        </section>

        {/* PENDING TRANS BANNER */}
        {paymentRef && (
          <section className="mb-8 rounded-3xl bg-rose-500/5 border border-rose-500/15 p-5 text-left flex flex-col gap-3 animate-pulse">
            <div className="flex items-center gap-3 text-rose-400 text-sm font-black">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>Pending transaction detected in local cache</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you have completed your payment on the Paystack checkout page, click below to immediately verify and credit your points.
            </p>
            <Button
              size="lg"
              onClick={() => verifyPaymentReference(paymentRef)}
              disabled={checkingPayment}
              className="w-full sm:w-auto self-start h-12 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-2xl"
            >
              {checkingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify Transaction Status Now
            </Button>
          </section>
        )}

        {/* PRICE GRID HERO */}
        <section className="space-y-4 mb-10">
          <h3 className="font-display text-sm font-black text-white uppercase tracking-widest px-1">
            🎁 Select a Top-up Pack
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`group relative overflow-hidden rounded-[2rem] border bg-gradient-to-b p-6 transition-all flex flex-col justify-between cursor-pointer ${pkg.color} ${selectedPackage === pkg.id ? 'ring-2 ring-primary scale-[1.01] shadow-glow' : 'hover:scale-[1.005] hover:border-white/10'}`}
              >
                {/* Decorative glow */}
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${pkg.badge}`}>
                      {pkg.tag}
                    </span>
                    {pkg.bonus && (
                      <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                    )}
                  </div>
                  
                  <h4 className="font-display text-lg font-black text-white">{pkg.name}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1 min-h-[32px] leading-relaxed">
                    {pkg.desc}
                  </p>
                  
                  {/* POINTS LARGE DISPLAY */}
                  <div className="my-6">
                    <span className={`text-4xl font-display font-black tracking-tight ${pkg.text_color}`}>
                      {pkg.points}
                    </span>
                    <span className="text-xs font-bold text-muted-foreground ml-1.5 uppercase">Pts</span>
                    {pkg.bonus && (
                      <p className="text-[10px] text-amber-400 font-bold mt-1 uppercase tracking-wide">
                        {pkg.bonus}
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative z-10 pt-4 border-t border-white/5 flex flex-col gap-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-semibold">Total Cost</span>
                    <span className="text-lg font-display font-black text-white">GHS {pkg.amount.toFixed(2)}</span>
                  </div>
                  
                  <Button
                    size="sm"
                    disabled={loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePurchase(pkg.id);
                    }}
                    className={`w-full h-11 rounded-xl font-bold text-xs ${selectedPackage === pkg.id ? 'bg-primary hover:bg-primary/90 text-white' : 'bg-white/5 border border-white/10 hover:bg-white/10 text-white'}`}
                  >
                    {loading && selectedPackage === pkg.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1.5" />
                    )}
                    Top-Up Pack
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* VALUE PROPOSITION LIST */}
        <section className="glass-card rounded-3xl border border-white/5 p-6 bg-white/5 mb-8">
          <h3 className="font-display text-base font-black text-white flex items-center gap-2 mb-4">
            <HelpCircle className="h-5 w-5 text-primary" />
            What do Points unlock?
          </h3>
          
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: ShieldCheck, title: "100% Secure Checkout", desc: "Transactions processed with bank-level encryption by Paystack." },
              { icon: Award, title: "Comprehensive AI Grading", desc: "Detailed step-by-step scoring of objectives & typed workings." },
              { icon: TrendingUp, title: "Diagnostic Progress Logs", desc: "Identifies your weaknesses and shows performance metrics." },
              { icon: Sparkles, title: "Correction Feedback", desc: "Provides high-quality AI corrections on why your answers were wrong." }
            ].map((prop, i) => (
              <li key={i} className="flex gap-3 items-start">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <prop.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold text-white text-xs">{prop.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{prop.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-[9px] text-center text-muted-foreground/30 uppercase tracking-[0.15em] font-black mt-8">
          🔒 Secured & Powered by Paystack merchant services
        </p>

      </main>

      <BottomNav />
    </div>
  );
}
