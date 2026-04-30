import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Award, ArrowLeft, Download, Share2, Target, Brain, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, 
  Search, Sparkles, LayoutDashboard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Skeleton from "@/components/Skeleton";
import LatexRenderer from "@/components/LatexRenderer";

const getWassceGrade = (score: number) => {
  if (score >= 80) return { grade: "A1", label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 70) return { grade: "B2", label: "Very Good", color: "text-emerald-400", bg: "bg-emerald-500/10" };
  if (score >= 60) return { grade: "B3", label: "Good", color: "text-blue-400", bg: "bg-blue-500/10" };
  if (score >= 55) return { grade: "C4", label: "Credit", color: "text-blue-300", bg: "bg-blue-400/10" };
  if (score >= 50) return { grade: "C5", label: "Credit", color: "text-amber-400", bg: "bg-amber-500/10" };
  if (score >= 45) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-400/10" };
  if (score >= 40) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10" };
  if (score >= 35) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10" };
};

const ExamResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { attemptId?: string } | null;
  const attemptId = state?.attemptId;

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [theorySubmissions, setTheorySubmissions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch Attempt
      const { data: attData } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();
      
      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);
      }

      // 2. Fetch Theory Submissions (The Analysis)
      const { data: theoryData } = await supabase
        .from('theory_submissions')
        .select('*')
        .eq('attempt_id', attemptId)
        .order('question_number', { ascending: true });
      
      if (theoryData) {
        setTheorySubmissions(theoryData);
      }

    } catch (err: any) {
      console.error("Error fetching results:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-10 animate-pulse">
        <Skeleton variant="rectangle" className="h-12 w-full rounded-2xl" />
        <div className="flex flex-col items-center gap-4">
           <Skeleton variant="circle" className="h-24 w-24" />
           <Skeleton variant="text" className="h-8 w-1/2" />
        </div>
        <Skeleton variant="rectangle" className="h-64 w-full rounded-[2.5rem]" />
        <Skeleton variant="rectangle" className="h-64 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24 overflow-x-hidden selection:bg-primary/30">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className={`absolute top-0 left-0 h-full w-full opacity-20 bg-gradient-to-b from-primary/10 to-transparent`} />
        <div className="absolute top-[20%] -left-[10%] h-[500px] w-[500px] rounded-full bg-emerald-600/10 blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[10%] h-[400px] w-[400px] rounded-full bg-blue-600/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 max-w-3xl items-center justify-between px-4">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            <span>Dashboard</span>
          </button>
          
          <div className="flex gap-2">
             <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all">
                <Share2 className="h-4 w-4" />
             </button>
             <button className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10 transition-all">
                <Download className="h-4 w-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-4 sm:px-6 max-w-3xl mx-auto mt-8 animate-fade-up">
        
        {/* ── 1. MASTER SCORECARD ── */}
        <section className="text-center mb-10">
           <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] ${gradeInfo.bg} border border-white/10 mb-6 shadow-glow relative overflow-hidden group`}>
              <Award className={`h-12 w-12 ${gradeInfo.color} relative z-10 group-hover:scale-110 transition-transform`} />
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
           </div>
           <h1 className="font-display text-4xl font-extrabold text-white tracking-tight">
             WASSCE Grade: <span className={gradeInfo.color}>{gradeInfo.grade}</span>
           </h1>
           <p className="text-muted-foreground mt-2 font-medium flex items-center justify-center gap-2">
             {exam?.subject} • {exam?.year} <span className="h-1 w-1 rounded-full bg-white/20" /> {gradeInfo.label}
           </p>
        </section>

        {/* ── 2. STATS OVERVIEW ── */}
        <div className="grid grid-cols-2 gap-4 mb-8">
           <div className="glass-card rounded-[2rem] p-6 border border-white/5 flex flex-col items-center text-center">
              <Target className="h-5 w-5 text-primary mb-3" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Final Score</p>
              <p className="text-3xl font-black text-white">{attempt?.total_score || 0}%</p>
           </div>
           <div className="glass-card rounded-[2rem] p-6 border border-white/5 flex flex-col items-center text-center">
              <Brain className="h-5 w-5 text-purple-400 mb-3" />
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">AI Status</p>
              <p className="text-lg font-extrabold text-emerald-400">Marked ✓</p>
           </div>
        </div>

        {/* ── 3. THEORY ANALYSIS (The Core) ── */}
        <section className="space-y-6">
           <div className="flex items-center justify-between px-2">
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" /> Forensic Analysis
              </h3>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Theory Breakdown</span>
           </div>

           <div className="space-y-4">
              {theorySubmissions.length === 0 ? (
                <div className="p-12 text-center glass-card rounded-3xl border-dashed border-white/10">
                   <p className="text-muted-foreground text-sm">No theory workings found for this attempt.</p>
                </div>
              ) : (
                theorySubmissions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className={`glass-card rounded-[2rem] border overflow-hidden transition-all duration-300 ${expandedId === sub.id ? 'border-primary/30 ring-1 ring-primary/20' : 'border-white/5 hover:border-white/10'}`}
                  >
                    <button 
                      onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                      className="w-full flex items-center justify-between p-6 text-left"
                    >
                      <div className="flex items-center gap-4">
                         <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-bold text-lg ${sub.marks_attained >= (sub.max_marks / 2) ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'} border border-white/5`}>
                           {sub.marks_attained || 0}
                         </div>
                         <div>
                            <p className="text-sm font-bold text-white">Question {sub.question_number}</p>
                            <p className="text-xs text-muted-foreground">Marks: {sub.marks_attained} / {sub.max_marks || 10}</p>
                         </div>
                      </div>
                      {expandedId === sub.id ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </button>

                    {expandedId === sub.id && (
                      <div className="px-6 pb-6 animate-fade-in">
                         {/* Side-by-side Layout for Analysis */}
                         <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                            {/* Student Work */}
                            <div className="space-y-3">
                               <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Your Submitted Work</p>
                               <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 group relative">
                                  <img 
                                    src={sub.image_url} 
                                    alt={`Submission Q${sub.question_number}`} 
                                    className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <div className="absolute inset-0 bg-black/20" />
                               </div>
                            </div>

                            {/* AI Feedback */}
                            <div className="space-y-3">
                               <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                 <Sparkles className="h-3 w-3" /> AI Examiner Feedback
                               </p>
                               <div className="bg-primary/5 rounded-2xl p-5 border border-primary/10 min-h-[150px]">
                                  <div className="text-sm text-blue-100/80 leading-relaxed italic whitespace-pre-wrap">
                                    "{sub.feedback || "The AI is finalising the detailed feedback for this specific step..."}"
                                  </div>
                               </div>
                               <div className="flex items-center gap-2 px-1">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Verified by LangGraph Agent</span>
                               </div>
                            </div>
                         </div>
                      </div>
                    )}
                  </div>
                ))
              )}
           </div>
        </section>

        {/* ── 4. QUICK ACTION ── */}
        <div className="mt-12 flex flex-col gap-4">
           <Button 
             onClick={() => navigate("/dashboard")}
             className="w-full h-14 rounded-full bg-gradient-hero text-white font-extrabold shadow-glow hover:scale-[1.02] transition-transform border-0"
           >
              <LayoutDashboard className="mr-2 h-5 w-5" /> Back to Dashboard
           </Button>
           <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
             Results officially certified by AceWassce AI
           </p>
        </div>
      </main>
    </div>
  );
};

export default ExamResults;
