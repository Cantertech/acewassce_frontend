import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, BrainCircuit, ScanSearch, FileCheck2, Loader2, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

const TheorySubmitSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string, mcqCompleted?: boolean } | null;
  const attemptId = state?.attemptId;
  const [mcqCompleted, setMcqCompleted] = useState(state?.mcqCompleted ?? true);

  const [markingStep, setMarkingStep] = useState(0);
  const [markingStatus, setMarkingStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);

  const MARKING_STEPS = [
    { icon: ScanSearch, text: "Scanning handwriting and diagrams..." },
    { icon: BrainCircuit, text: "AI matching workings against WAEC marking scheme..." },
    { icon: FileCheck2, text: "Aggregating objective and theory scores..." },
  ];

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }

    // 1. Poll for Grading Status
    const checkStatus = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('exam_attempts')
          .select('status')
          .eq('id', attemptId)
          .single();

        if (fetchError) throw fetchError;

        setMarkingStatus(data.status);

        if (data.status === 'graded') {
          navigate("/exam/results", { state: { attemptId } });
        }
      } catch (err: any) {
        console.error("Polling error:", err.message);
        setError("Connection lost. Please stay on this page.");
      }
    };

    const polling = setInterval(checkStatus, 3000);

    // 2. Purely Visual Animation Progression
    const animation = setInterval(() => {
      setMarkingStep((prev) => (prev < MARKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 5000);

    return () => {
      clearInterval(polling);
      clearInterval(animation);
    };
  }, [attemptId, navigate]);

  // --------------------------------------------------------
  // STATE 1: THEORY MARKED BUT MCQ PENDING
  // --------------------------------------------------------
  if (markingStatus === 'theory_marked' || !mcqCompleted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
        <button 
          onClick={() => setMarkingStatus('pending')} 
          className="absolute top-4 right-4 text-[10px] text-white/20 underline"
        >
          Dev: Reset Status
        </button>
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px]" />
          <div className="absolute bottom-[20%] right-[20%] h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-lg text-center animate-fade-up">
          <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500/20 to-emerald-400/5 ring-1 ring-emerald-500/50 shadow-glow">
            <CheckCircle className="h-10 w-10 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Theory Marked!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base px-6 mb-10 leading-relaxed">
            Your written answers have been graded by the AI. However, you still need to complete the <b>Objective (MCQ)</b> section to receive your final results report.
          </p>

          <div className="space-y-4">
            <Button
              size="lg"
              onClick={() => navigate("/exam/mcq", { state: { attemptId, examId: state?.examId } })}
              className="w-full h-14 rounded-2xl bg-primary text-white font-extrabold shadow-elevated transition-transform active:scale-95"
            >
              Start Multiple Choice Section
              <Play className="ml-2 h-5 w-5 fill-current" />
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
  }

  // --------------------------------------------------------
  // STATE 2: BOTH TAKEN -> AI MARKING IN PROGRESS
  // --------------------------------------------------------
  const CurrentIcon = MARKING_STEPS[markingStep].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      <button 
        onClick={() => setMcqCompleted(false)} 
        className="absolute top-4 right-4 text-[10px] text-white/20 underline"
      >
        Dev: Toggle 'MCQs Not Taken'
      </button>

      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[30%] left-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[40%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center animate-fade-in">
        <h2 className="font-display text-3xl font-extrabold text-white mb-2">Grading in Progress</h2>
        <p className="text-sm text-muted-foreground mb-12 px-4">
          Our AI examiner is currently reviewing your theory workings...
        </p>

        {/* Dynamic Animation Area */}
        <div className="relative mx-auto mb-12 flex h-40 w-40 items-center justify-center">
          {/* Outer rotating pulse */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-primary/10 animate-[spin_5s_linear_infinite_reverse]" />
          
          {/* Inner solid ring */}
          <div className="absolute inset-4 rounded-full bg-primary/5 shadow-[0_0_30px_0_hsl(214_100%_60%/0.2)] flex items-center justify-center">
            <CurrentIcon className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>

        {/* Step Text */}
        <div className="h-16 mb-10">
          <p key={markingStep} className="text-base font-bold text-white animate-fade-up">
            {MARKING_STEPS[markingStep].text}
          </p>
          <div className="mt-4 flex justify-center gap-1.5">
            {MARKING_STEPS.map((_, i) => (
              <span 
                key={i} 
                className={`h-1.5 rounded-full transition-all duration-500 ${i === markingStep ? 'w-6 bg-primary' : i < markingStep ? 'w-2 bg-primary/50' : 'w-2 bg-white/10'}`} 
              />
            ))}
          </div>
        </div>

        <div className="w-full flex flex-col gap-3">
          {error ? (
            <div className="flex items-center justify-center gap-2 text-xs text-rose-400 font-semibold bg-rose-500/5 rounded-2xl py-3 border border-rose-500/10 mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold bg-white/5 rounded-2xl py-3 border border-white/10 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Please wait, generating final report...
            </div>
          )}

          <button 
            onClick={() => navigate("/dashboard")}
            className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
          >
            Leave & Notify me when done
          </button>
        </div>
      </div>
    </div>
  );
};

export default TheorySubmitSuccess;
