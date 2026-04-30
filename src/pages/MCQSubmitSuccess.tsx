import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, ArrowRight, ShieldCheck, FileText, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const MCQSubmitSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { 
    attemptId?: string, 
    answeredCount?: number,
    totalCount?: number 
  } | null;
  const attemptId = state?.attemptId;
  const answeredCount = state?.answeredCount || 0;
  const totalCount = state?.totalCount || 50;

  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }

    const checkStatus = async () => {
      const { data } = await supabase
        .from('exam_attempts')
        .select('status')
        .eq('id', attemptId)
        .single();
      
      if (data) {
        setStatus(data.status);
        if (data.status === 'graded') {
          navigate("/exam/results", { state: { attemptId } });
        }
      }
      setLoading(false);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [attemptId, navigate]);

  const handleProceedToTheory = () => {
    navigate("/exam/theory", { state: { attemptId, examId } });
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-[#0B0F1A] px-4 py-20 overflow-hidden font-inter">
      {/* ── BACKGROUND MESH ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg text-center animate-fade-up">
        {/* SUCCESS ICON */}
        <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/5 ring-1 ring-emerald-500/50 shadow-glow">
          <CheckCircle className="h-10 w-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
        </div>

        <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
          Part 1 Complete!
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base px-6 mb-10 leading-relaxed">
          Great job! Your objective answers have been securely submitted and recorded. Final grading will occur after you complete the Theory section.
        </p>

        {/* QUICK STATS PANEL */}
        <div className="glass-card flex items-center justify-between p-6 rounded-[2rem] border border-white/10 shadow-soft mb-10">
          <div className="flex flex-col items-center flex-1 border-r border-white/10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 mb-2">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <p className="font-display text-2xl font-extrabold text-white">
              {answeredCount} / {totalCount}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Answered
            </p>
          </div>
          <div className="flex flex-col items-center flex-1">
             <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-2">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="font-display text-2xl font-extrabold text-white">
              Secure
            </p>
             <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">
              Status
            </p>
          </div>
        </div>

        {/* NEXT STEPS */}
        <div className="space-y-4">
          <Button
            size="lg"
            onClick={handleProceedToTheory}
            className="w-full h-14 rounded-2xl bg-white text-primary hover:bg-white/90 font-extrabold shadow-elevated transition-transform active:scale-95"
          >
            Take Full Written Theory
            <FileText className="ml-2 h-5 w-5" />
          </Button>
          
          <button 
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
          >
            Take a break and return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCQSubmitSuccess;
