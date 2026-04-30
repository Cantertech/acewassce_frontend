import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, X, LayoutGrid, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import Skeleton from "@/components/Skeleton";
import LatexRenderer from "@/components/LatexRenderer";
import { supabase } from "@/lib/supabase";

const MCQExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { examId?: string, attemptId?: string } | null;
  const examId = state?.examId;
  const attemptId = state?.attemptId;

  const [questions, setQuestions] = useState<any[]>([]);
  const [examMetadata, setExamMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);

  const question = questions[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === (questions.length > 0 ? questions.length - 1 : 0);

  useEffect(() => {
    if (!examId) {
      navigate('/practice');
      return;
    }

    async function fetchData() {
      // Fetch metadata
      const { data: mData } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (mData) {
        setExamMetadata(mData);
      }

      // Fetch questions
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .eq('is_mcq', true);
        
      if (data) {
        const sorted = data.sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number));
        setQuestions(sorted);
      }
      setIsLoading(false);
    }
    fetchData();
  }, [examId]);

  useEffect(() => {
    if (isLoading || !examMetadata) return;

    // PERSISTENT TIMER LOGIC
    const EXAM_KEY = `acewassce_mcq_timer_${examId}`;
    const savedEndTime = localStorage.getItem(EXAM_KEY);
    const DURATION = examMetadata.mcq_duration || 5400;

    if (savedEndTime) {
      const remaining = Math.max(0, Math.floor((parseInt(savedEndTime) - Date.now()) / 1000));
      setTimeLeft(remaining);
    } else {
      const endTime = Date.now() + DURATION * 1000;
      localStorage.setItem(EXAM_KEY, endTime.toString());
      setTimeLeft(DURATION);
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem(EXAM_KEY);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLoading, examMetadata]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleSelect = (option: string) => {
    setAnswers({ ...answers, [question.id]: option });
  };

  const handleNext = () => {
    if (!isLast) setCurrentIdx(currentIdx + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setCurrentIdx(currentIdx - 1);
  };

  const submitExam = async () => {
    if (!attemptId) return;
    
    setIsSubmitting(true);
    localStorage.removeItem(`acewassce_mcq_timer_${examId}`);
    
    try {
      // 1. Save all responses to the database
      const responseData = Object.entries(answers).map(([qId, option]) => ({
        attempt_id: attemptId,
        question_id: qId,
        selected_option: option
      }));

      if (responseData.length > 0) {
        const { error: resError } = await supabase
          .from('exam_responses')
          .insert(responseData);
        
        if (resError) throw resError;
      }

      // 2. Call the RPC to grade the exam instantly
      const { error: gradeError } = await supabase.rpc('grade_mcq_attempt', {
        p_attempt_id: attemptId
      });

      if (gradeError) throw gradeError;

      // 3. Success!
      navigate("/exam/mcq-success", { state: { attemptId } });
    } catch (error: any) {
      console.error("Submission error:", error.message);
      alert("Failed to submit exam. Please check your connection.");
      setIsSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    alert("Time is up! Your answers are being auto-submitted.");
    submitExam();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-12 animate-pulse mt-12">
          <div className="space-y-4">
            <Skeleton variant="rectangle" className="h-6 w-24 rounded-full" />
            <Skeleton variant="text" className="h-10 w-full" />
            <Skeleton variant="text" className="h-10 w-3/4" />
          </div>
          <div className="space-y-4 pt-8">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="rectangle" className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-primary/20 border-t-primary shadow-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Send className="h-8 w-8 text-primary animate-pulse" />
          </div>
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white mb-2 italic">Finishing Exam...</h2>
        <p className="text-muted-foreground animate-pulse">Calculating your performance score</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">No Questions Found</h2>
        <p className="text-muted-foreground mb-8">We couldn't load questions for this exam ID.</p>
        <button onClick={() => navigate('/practice')} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors">
          Return to Subjects
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-x-hidden">
      {/* ── TOP HEADER (TIMER & EXIT) ── */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="container max-w-3xl flex h-16 items-center justify-between px-4">
          <button 
            onClick={() => setShowExitConfirm(true)}
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Time Remaining</span>
            <div className={`flex items-center gap-1.5 font-display text-lg font-extrabold ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          </div>
          
          <button 
            onClick={() => setShowNavigator(true)}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-sm font-bold text-muted-foreground hover:bg-white/10 hover:text-white transition-colors"
          >
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span className="text-white">{currentIdx + 1}</span> / {questions.length}
          </button>
        </div>
      </header>

      {/* ── QUESTION AREA ── */}
      <main className="flex-1 container max-w-3xl px-4 sm:px-6 py-8 sm:py-12 animate-fade-in">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-4">
            Question {question?.question_number}
          </span>

          {/* DIAGRAM DISPLAY - NOW ABOVE TEXT */}
          {question?.image_url && (
            <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl">
              <div className="relative group">
                <img 
                  src={question.image_url} 
                  alt={`Diagram for Question ${question.question_number}`}
                  className="w-full h-auto object-contain rounded-2xl max-h-[350px] mx-auto filter brightness-110"
                />
              </div>
            </div>
          )}

          <div className="text-xl sm:text-2xl font-medium text-white/90 leading-relaxed tracking-wide break-words w-full py-2">
            <LatexRenderer text={question?.question_text || ""} />
          </div>
        </div>

        {/* OPTIONS MULTIPLE CHOICE */}
        <div className="flex flex-col gap-3">
          {question.options?.map((option: any, i: number) => {
            const optId = option.id || String.fromCharCode(65 + i); // A, B, C, D
            const optText = option.text || option;
            const isSelected = answers[question.id] === optText;
            
            return (
              <button
                key={i}
                onClick={() => handleSelect(optText)}
                className={`group relative flex items-center gap-4 rounded-2xl border p-4 sm:p-5 transition-all text-left ${
                  isSelected
                    ? "bg-primary/15 border-primary shadow-[0_0_15px_0_hsl(214_100%_60%/0.15)]"
                    : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold border transition-colors ${
                  isSelected ? "bg-primary text-white border-primary" : "bg-black/20 text-muted-foreground border-white/10"
                }`}>
                  {optId}
                </div>
                <div className={`text-base sm:text-lg font-medium flex-1 min-w-0 break-words ${isSelected ? "text-white font-bold" : "text-foreground/90"}`}>
                  <LatexRenderer text={optText || ""} />
                </div>
                
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                )}
              </button>
            );
          })}
        </div>
      </main>

      {/* ── BOTTOM CONTROLS ── */}
      <footer className="sticky bottom-0 z-40 bg-card/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="container max-w-3xl flex items-center justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handlePrev}
            disabled={isFirst}
            className="rounded-xl border-white/10 hover:bg-white/10 disabled:opacity-30"
          >
            <ChevronLeft className="mr-1 h-5 w-5" />
            Prev
          </Button>

          {isLast ? (
            <Button
              size="lg"
              onClick={submitExam}
              className="rounded-xl px-8 bg-gradient-hero text-white font-extrabold shadow-glow hover:scale-105 transition-transform"
            >
              Submit MCQs
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              className="rounded-xl bg-white text-primary hover:bg-white/90 font-bold"
            >
              Next
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          )}
        </div>
      </footer>

      {/* ── EXIT CONFIRMATION MODAL ── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)} />
          <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated animate-fade-up text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-display text-xl font-extrabold text-white">End Exam Early?</h3>
            <p className="text-sm text-muted-foreground mt-2 mb-6">
              If you exit now, your current progress will not be saved. Are you sure?
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowExitConfirm(false)} 
                className="flex-1 rounded-xl border-white/10"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={() => navigate("/dashboard")} 
                className="flex-1 rounded-xl"
              >
                End Exam
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION NAVIGATOR MODAL ── */}
      {showNavigator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowNavigator(false)} />
          <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-extrabold text-white">Question Navigator</h3>
              <button 
                onClick={() => setShowNavigator(false)} 
                className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-muted-foreground hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
              {questions.map((q, i) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = currentIdx === i;
                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIdx(i);
                      setShowNavigator(false);
                    }}
                    className={`flex h-10 w-full items-center justify-center rounded-xl text-sm font-bold transition-all ${
                      isCurrent 
                        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-white/10 text-white' 
                        : isAnswered 
                          ? 'bg-primary/20 text-primary border border-primary/30' 
                          : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 flex items-center justify-around text-xs font-semibold text-muted-foreground">
               <div className="flex items-center gap-1.5">
                 <span className="h-3 w-3 rounded-full bg-primary/20 border border-primary/30" /> 
                 Answered
               </div>
               <div className="flex items-center gap-1.5">
                 <span className="h-3 w-3 rounded-full bg-white/5 border border-white/10" /> 
                 Unanswered
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MCQExam;
