import { useState, useEffect } from "react";
import { 
  Sparkles, 
  Coins, 
  CreditCard, 
  Loader2, 
  X, 
  Gift, 
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const backendUrl = import.meta.env.VITE_BACKEND_URL || "https://acewassce-backend.onrender.com";

const PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    points: 50,
    amount: 5,
    tag: "Most Popular",
    bonus: null,
    color: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    text_color: "text-blue-400"
  },
  {
    id: "standard",
    name: "Standard Pack",
    points: 110,
    amount: 10,
    tag: "Best Value",
    bonus: "10 Bonus Points Included!",
    color: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    text_color: "text-purple-400"
  },
  {
    id: "pro",
    name: "Pro Pack",
    points: 240,
    amount: 20,
    tag: "Ultimate Value",
    bonus: "40 Bonus Points Included!",
    color: "from-rose-500/20 to-rose-600/5 border-rose-500/30",
    text_color: "text-rose-400"
  }
];

export default function WalletModal({ isOpen, onClose, onSuccess }: WalletModalProps) {
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState("starter");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchWalletBalance();
    }
  }, [isOpen]);

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

  const handlePurchase = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to purchase points");
        return;
      }

      const res = await fetch(`${backendUrl}/api/v1/payments/initialize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          student_id: user.id,
          package_id: selectedPackage
        })
      });

      if (!res.ok) {
        throw new Error("Failed to initialize payment with backend");
      }

      const data = await res.json();
      if (data.status === "success" && data.authorization_url) {
        setPaymentRef(data.reference);
        // Save pending payment state to localStorage so we can auto-verify on return
        localStorage.setItem("pending_payment_ref", data.reference);
        
        toast.success("Redirecting to Paystack Secure Checkout...");
        
        // Wait 1s and open Paystack checkout page
        setTimeout(() => {
          window.location.href = data.authorization_url;
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong during payment initialization");
    } finally {
      setLoading(false);
    }
  };

  // On return from Paystack, the user can verify their payment reference on-demand
  const verifyPaymentReference = async (refToVerify: string) => {
    try {
      setCheckingPayment(true);
      const res = await fetch(`${backendUrl}/api/v1/payments/verify/${refToVerify}`);
      const data = await res.json();
      
      if (data.status === "success") {
        toast.success(data.message || "Payment verified and points credited!");
        localStorage.removeItem("pending_payment_ref");
        setPaymentRef(null);
        fetchWalletBalance();
        if (onSuccess) onSuccess();
      } else {
        toast.error(data.message || "Payment is still processing or has failed.");
      }
    } catch (err) {
      toast.error("Verification failed. Please try again.");
    } finally {
      setCheckingPayment(false);
    }
  };

  useEffect(() => {
    const savedRef = localStorage.getItem("pending_payment_ref");
    if (savedRef) {
      setPaymentRef(savedRef);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-xl animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-card/95 border border-white/10 rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-glow animate-fade-up overflow-hidden">
        {/* Decorative Grid Line */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
        <div className="absolute -top-[20%] -right-[20%] h-44 w-44 rounded-full bg-primary/20 blur-[50px] pointer-events-none" />
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-glow mb-3">
            <Coins className="h-6 w-6 animate-pulse" />
          </div>
          <h2 className="font-display text-xl font-black text-white">Points Store</h2>
          <p className="text-xs text-muted-foreground max-w-xs mt-1">
            Unlock instant AI evaluation & grading. <b>10 Points = 1 Full WASSCE Mock Attempt</b>
          </p>
        </div>

        {/* Current Balance Card */}
        <div className="glass-card rounded-2xl border border-white/5 p-4 bg-white/5 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your Wallet</p>
              <p className="text-base font-display font-extrabold text-white">Current Balance</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-display font-black text-amber-400">
              {walletPoints !== null ? walletPoints : <Loader2 className="h-5 w-5 animate-spin inline-block" />}
            </span>
            <span className="text-xs text-muted-foreground/60 font-bold ml-1">Pts</span>
          </div>
        </div>

        {/* Pending payment notification */}
        {paymentRef && (
          <div className="mb-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 p-4 text-left flex flex-col gap-2 animate-pulse">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Pending transaction detected</span>
            </div>
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
              If you just made a payment, click verify to confirm status and claim your points.
            </p>
            <Button
              size="sm"
              onClick={() => verifyPaymentReference(paymentRef)}
              disabled={checkingPayment}
              className="mt-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
            >
              {checkingPayment ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
              Verify Transaction Status
            </Button>
          </div>
        )}

        {/* Packages List */}
        <div className="space-y-3 mb-6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left mb-2 px-1">Select Point Package</p>
          
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`w-full text-left relative overflow-hidden rounded-2xl border bg-gradient-to-r p-4 transition-all flex items-center justify-between ${pkg.color} ${selectedPackage === pkg.id ? 'ring-2 ring-primary scale-[1.01]' : 'opacity-80 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-4 relative z-10">
                <div className={`h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-display font-black text-sm ${pkg.text_color}`}>
                  {pkg.points}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-sm">{pkg.name}</p>
                    {pkg.tag && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/20 text-[8px] font-black uppercase text-primary tracking-wide">
                        {pkg.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                    {pkg.bonus ? pkg.bonus : "Standard Package"}
                  </p>
                </div>
              </div>
              <div className="text-right relative z-10 shrink-0">
                <p className="font-display font-black text-base text-white">GHS {pkg.amount.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Paystack</p>
              </div>
            </button>
          ))}
        </div>

        {/* Action Button */}
        <Button
          size="lg"
          onClick={handlePurchase}
          disabled={loading}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-glow transition-transform active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <CreditCard className="h-5 w-5 mr-2" />
          )}
          {loading ? "Initializing..." : `Buy Points • GHS ${PACKAGES.find(p => p.id === selectedPackage)?.amount.toFixed(2)}`}
        </Button>
        
        <p className="text-[9px] text-center text-muted-foreground/40 mt-4 uppercase tracking-widest font-black">
          🔒 Secure 256-bit encryption by Paystack Payments
        </p>
      </div>
    </div>
  );
}
