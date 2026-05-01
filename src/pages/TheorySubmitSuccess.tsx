import { useState, useEffect } from "react";
import { CheckCircle, ArrowRight, BrainCircuit, ScanSearch, FileCheck2, Loader2, Play, AlertCircle, Home, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";

const TheorySubmitSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string, mcqCompleted?: boolean, examId?: string } | null;
  const attemptId = state?.attemptId;
  const [examId, setExamId] = useState(state?.examId);
  const [mcqCompleted, setMcqCompleted] = useState(state?.mcqCompleted ?? false);

  const [markingStep, setMarkingStep] = useState(0);
  const [markingStatus, setMarkingStatus] = useState<string>('pending');
  const [error, setError] = useState<string | null>(null);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    // Reveal action buttons after 8 seconds of marking simulation
    const timer = setTimeout(() => setShowSkip(true), 8000);
    return () => clearTimeout(timer);
  }, []);

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

    const fetchData = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('exam_attempts')
          .select('status, exam_id, mcq_completed_at')
          .eq('id', attemptId)
          .single();

        if (fetchError) throw fetchError;

        setMarkingStatus(data.status);
        if (!examId) setExamId(data.exam_id);
        if (data.mcq_completed_at) setMcqCompleted(true);

        if (data.status === 'graded') {
          // Final results ready - Student will click the button manually
        }
      } catch (err: any) {
        console.error("Fetch error:", err.message);
        setError("Connection lost. Retrying...");
      }
    };

    fetchData();
    const polling = setInterval(fetchData, 4000);

    // Visual Animation Progression
    const animation = setInterval(() => {
      setMarkingStep((prev) => (prev < MARKING_STEPS.length - 1 ? prev + 1 : prev));
    }, 6000);

    return () => {
      clearInterval(polling);
      clearInterval(animation);
    };
  }, [attemptId, navigate, examId]);

  const handleStartMCQ = () => {
    if (!examId || !attemptId) {
      setError("Exam metadata missing. Return to dashboard.");
      return;
    }
    navigate("/exam/mcq", { state: { attemptId, examId } });
  };

  // --------------------------------------------------------
  // STATE 1: THEORY MARKED BUT MCQ PENDING (Standardized Nice View)
  // --------------------------------------------------------
  if (markingStatus === 'theory_marked' || (markingStatus !== 'pending' && !mcqCompleted)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
        <div className="pointer-events-none fixed inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[100px]" />
        </div>

        <div className="relative z-10 w-full max-w-xl text-center animate-fade-up">
          <div className="mx-auto mb-10 relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full" />
            <div className="relative flex h-28 w-28 mx-auto items-center justify-center rounded-[2.5rem] bg-gradient-to-tr from-emerald-500 to-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.3)] border-4 border-white/10">
              <CheckCircle className="h-14 w-14 text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-emerald-100">
               <Sparkles className="h-5 w-5 text-emerald-500" />
            </div>
          </div>

          <h1 className="font-display text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-6">
            Theory Marked!
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg px-8 mb-12 leading-relaxed font-medium">
            Great job! Your written papers have been analyzed and graded. 
            To release your <span className="text-white font-bold underline decoration-emerald-500 underline-offset-4">Full Result Certificate</span>, please complete the Objective (MCQ) section.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4">
            <Button
              size="lg"
              onClick={handleStartMCQ}
              className="h-16 rounded-3xl bg-white text-primary hover:bg-emerald-50 font-black text-lg shadow-glow-white active:scale-95 transition-all group"
            >
              Start MCQs
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/dashboard")}
              className="h-16 rounded-3xl border-white/10 bg-white/5 text-white hover:bg-white/10 font-bold active:scale-95 transition-all"
            >
              <Home className="mr-2 h-5 w-5 opacity-50" />
              Save & Exit
            </Button>
          </div>

          <p className="mt-10 text-xs font-bold text-white/30 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <Clock className="h-3 w-3" />
            Your progress is securely saved
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // STATE 2: AI MARKING IN PROGRESS
  // --------------------------------------------------------
  const CurrentIcon = MARKING_STEPS[markingStep].icon;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[30%] left-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[150px] animate-pulse" />
        <div className="absolute top-[40%] right-[10%] h-[400px] w-[400px] rounded-full bg-emerald-600/10 blur-[120px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <div className="relative z-10 w-full max-w-md text-center animate-fade-in">
        <h2 className="font-display text-3xl font-extrabold text-white mb-2">
          {mcqCompleted ? "Mock Exam Complete!" : "Theory Submitted!"}
        </h2>
        <p className="text-sm text-muted-foreground mb-12 px-4 leading-relaxed font-medium">
          {mcqCompleted 
            ? "Great job! Both sections have been securely recorded. Our AI examiner is finishing your final report..."
            : "Excellent work! Your written answers have been submitted. Our AI examiner is currently reviewing your theory workings..."}
        </p>

        {/* Dynamic Animation Area */}
        <div className="relative mx-auto mb-12 flex h-40 w-40 items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30 animate-[spin_10s_linear_infinite]" />
          <div className="absolute inset-2 rounded-full border-2 border-primary/10 animate-[spin_5s_linear_infinite_reverse]" />
          <div className="absolute inset-4 rounded-full bg-primary/5 shadow-[0_0_30px_0_hsl(214_100%_60%/0.2)] flex items-center justify-center border border-white/5">
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
          {showSkip && (
            <Button
              size="lg"
              disabled={mcqCompleted && markingStatus !== 'graded'}
              onClick={() => {
                if (markingStatus === 'graded') {
                  navigate("/exam/results", { state: { attemptId } });
                } else {
                  handleStartMCQ();
                }
              }}
              className="w-full h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold shadow-glow animate-fade-up disabled:opacity-50"
            >
              {markingStatus === 'graded' 
                ? "View Final Results" 
                : mcqCompleted 
                  ? "Finalizing Final Results..." 
                  : "Skip to MCQs"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          )}

          {error ? (
            <div className="flex items-center justify-center gap-2 text-xs text-rose-400 font-semibold bg-rose-500/5 rounded-2xl py-3 border border-rose-500/10 mb-4">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-semibold bg-white/5 rounded-2xl py-3 border border-white/10 mb-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {markingStatus === 'graded' ? "Finalizing report..." : "Please wait, generating final report..."}
            </div>
          )}

          {showSkip && (
            <div className="flex justify-center gap-6 mt-4 animate-fade-in">
              <button 
                onClick={() => navigate("/dashboard")}
                className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
              >
                Continue Later
              </button>
              <button 
                onClick={() => navigate("/")}
                className="text-sm font-semibold text-muted-foreground hover:text-white transition-colors underline underline-offset-4"
              >
                Home
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheorySubmitSuccess;
