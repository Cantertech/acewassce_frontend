import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  ChevronLeft, List
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import Skeleton from "@/components/Skeleton";
import LatexRenderer from "@/components/LatexRenderer";

const getWassceGrade = (score: number) => {
  if (score >= 75) return { grade: "A1", label: "Distinction", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (score >= 70) return { grade: "B2", label: "Very Good", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
  if (score >= 65) return { grade: "B3", label: "Good", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  if (score >= 60) return { grade: "C4", label: "Credit", color: "text-blue-300", bg: "bg-blue-400/10", border: "border-blue-400/20" };
  if (score >= 55) return { grade: "C5", label: "Credit", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  if (score >= 50) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-400/10", border: "border-amber-500/20" };
  if (score >= 45) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  if (score >= 40) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
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
  const [mcqQuestions, setMcqQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  
  const [view, setView] = useState<'overview' | 'mcq' | 'theory'>('overview');
  const [expandedTheoryId, setExpandedTheoryId] = useState<string | null>(null);
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [showMcqGrid, setShowMcqGrid] = useState(false);

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
      const { data: attData } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);

        const { data: theoryData } = await supabase
          .from('theory_submissions')
          .select('*')
          .eq('attempt_id', attemptId)
          .order('question_number', { ascending: true });
        if (theoryData) setTheorySubmissions(theoryData);

        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true)
          .order('question_number', { ascending: true });
        if (qData) {
          setMcqQuestions(qData);
          if (qData.length > 0) setSelectedMcqId(qData[0].id);
        }

        const { data: respData } = await supabase
          .from('exam_responses')
          .select('*')
          .eq('attempt_id', attemptId);
        if (respData) setResponses(respData);
      }
    } catch (err: any) {
      console.error("Error fetching results:", err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
        <Skeleton variant="rectangle" className="h-16 w-full rounded-2xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-64 w-full rounded-3xl bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  const getCorrectOption = (marking: string, options: any[]) => {
    if (!marking) return null;
    const match = marking.match(/Equation:\s*([A-D])\s*=/);
    if (match) return match[1];
    
    const clean = (t: string) => t.replace(/[^0-9.]/g, '');
    const markingNum = clean(marking);
    if (!markingNum) return null;

    const bestMatch = options.find(opt => {
        const optNum = clean(opt.text);
        return optNum && optNum === markingNum;
    });
    return bestMatch?.id || null;
  };

  const selectedQ = mcqQuestions.find(q => q.id === selectedMcqId);
  const selectedResp = responses.find(r => r.question_id === selectedMcqId);
  const selectedCorrect = selectedQ ? getCorrectOption(selectedQ.marking_scheme, selectedQ.options || []) : null;
  const isSelectedCorrect = selectedResp?.selected_option === selectedCorrect;

  const currentIdx = mcqQuestions.findIndex(q => q.id === selectedMcqId);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-4xl h-16 flex items-center justify-between px-4 sm:px-6 mx-auto">
          <button 
            onClick={() => navigate("/dashboard")}
            className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all"
          >
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span>Dashboard</span>
          </button>
          
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">Certified Result</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 container max-w-4xl px-4 sm:px-6 pt-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* ── NAVIGATION TABS ── */}
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-10 w-fit mx-auto sm:mx-0">
          {(['overview', 'mcq', 'theory'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setView(t)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === t 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* ── VIEW 1: OVERVIEW ── */}
        {view === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative p-10 sm:p-14 rounded-[3rem] border border-white/10 overflow-hidden group shadow-2xl bg-[#030712]/40 backdrop-blur-xl">
                 <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative h-40 w-40 flex items-center justify-center">
                       <svg className="h-full w-full rotate-[-90deg]">
                          <circle cx="80" cy="80" r="72" className="fill-none stroke-white/5 stroke-[6]" />
                          <circle 
                            cx="80" cy="80" r="72" 
                            className="fill-none stroke-primary stroke-[8] transition-all duration-1000"
                            style={{ strokeDasharray: 452, strokeDashoffset: 452 - (452 * (attempt?.total_score || 0)) / 100 }}
                            strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute flex flex-col items-center">
                          <span className={`text-5xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{gradeInfo.label}</span>
                       </div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                       <h2 className="text-4xl font-black text-white mb-2 leading-tight">Mastered Logic.</h2>
                       <p className="text-slate-400 font-medium mb-6">Your forensic breakdown for {exam?.subject} is ready.</p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <div className="px-6 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-widest">{attempt?.total_score || 0}% Final</div>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full">
                    <Brain className="h-6 w-6 text-purple-400 mb-4" />
                    <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theory Score</span>
                        <span className="text-3xl font-black text-white">{attempt?.theory_score || 0}<span className="text-sm text-slate-500 font-bold">/100</span></span>
                    </div>
                 </div>
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full">
                    <Target className="h-6 w-6 text-emerald-400 mb-4" />
                    <div>
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MCQ Score</span>
                        <span className="text-3xl font-black text-white">{attempt?.mcq_score || 0}<span className="text-sm text-slate-500 font-bold">/50</span></span>
                    </div>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
               <Button onClick={() => setView('mcq')} className="h-20 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 group px-8 justify-between">
                  <div className="flex flex-col items-start text-left">
                     <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objectives</span>
                     <span className="text-base font-black text-slate-200">Review Errors</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
               </Button>
               <Button onClick={() => setView('theory')} className="h-20 rounded-[1.5rem] bg-primary/10 border border-primary/20 hover:bg-primary/20 group px-8 justify-between">
                  <div className="flex flex-col items-start text-left">
                     <span className="text-[10px] font-black text-primary uppercase tracking-widest">Theory Map</span>
                     <span className="text-base font-black text-slate-200">Step-by-Step Logic</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
               </Button>
            </div>
          </div>
        )}

        {/* ── VIEW 2: MCQ RE-DESIGN ── */}
        {view === 'mcq' && (
          <div className="space-y-6 animate-in fade-in duration-500 relative">
             
             {/* 1. SMALL SELECTOR BUTTON AT TOP */}
             <div className="flex justify-center mb-4">
                <button 
                  onClick={() => setShowMcqGrid(!showMcqGrid)}
                  className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all active:scale-95"
                >
                   <List className="h-3 w-3" />
                   <span>Select Question</span>
                   <ChevronDown className={`h-3 w-3 transition-transform ${showMcqGrid ? 'rotate-180' : ''}`} />
                </button>
             </div>

             {/* 2. POPUP GRID (Show if active) */}
             {showMcqGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                   <div className="grid grid-cols-5 gap-2">
                      {mcqQuestions.map((q) => {
                         const resp = responses.find(r => r.question_id === q.id);
                         const correct = getCorrectOption(q.marking_scheme, q.options || []);
                         const isCorrect = resp?.selected_option === correct;
                         const isSelected = selectedMcqId === q.id;

                         return (
                            <button
                               key={q.id}
                               onClick={() => {
                                  setSelectedMcqId(q.id);
                                  setShowMcqGrid(false);
                               }}
                               className={`h-10 rounded-lg flex items-center justify-center font-black text-xs transition-all ${
                                  isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''
                               } ${
                                  !resp ? 'bg-white/5 text-slate-600' :
                                  isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                                  'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                               }`}
                            >
                               {q.question_number}
                            </button>
                         );
                      })}
                   </div>
                </div>
             )}

             {/* 3. QUESTION DISPLAY CARD */}
             {selectedQ && (
                <div className="space-y-12">
                   <div className="p-8 sm:p-12 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between mb-10">
                         <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">Q{selectedQ.question_number}</div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forensic Analysis</span>
                         </div>
                         <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            isSelectedCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                         }`}>
                            {isSelectedCorrect ? 'Correct Path' : 'Logic Mismatch'}
                         </div>
                      </div>

                      <div className="text-2xl font-bold text-white mb-10 leading-relaxed">
                         <LatexRenderer text={selectedQ.question_text} />
                      </div>

                      {/* OPTIONS */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                         {(selectedQ.options || []).map((opt: any) => (
                            <div 
                              key={opt.id}
                              className={`p-6 rounded-2xl border flex items-center gap-5 transition-all ${
                                opt.id === selectedCorrect 
                                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' 
                                : opt.id === selectedResp?.selected_option
                                ? 'bg-rose-500/10 border-rose-500/40'
                                : 'bg-white/5 border-white/5 opacity-50'
                              }`}
                            >
                               <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm ${
                                  opt.id === selectedCorrect ? 'bg-emerald-500 text-white' : 
                                  opt.id === selectedResp?.selected_option ? 'bg-rose-500 text-white' : 
                                  'bg-white/10 text-slate-400'
                               }`}>
                                  {opt.id}
                               </div>
                               <div className="text-base font-bold text-slate-200">
                                  <LatexRenderer text={opt.text} />
                               </div>
                               {opt.id === selectedCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />}
                               {opt.id === selectedResp?.selected_option && opt.id !== selectedCorrect && <XCircle className="h-5 w-5 text-rose-400 ml-auto" />}
                            </div>
                         ))}
                      </div>

                      {/* MARKING LOGIC */}
                      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                         <div className="flex items-center gap-2 mb-4 text-slate-600">
                            <Info className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Examiner Solution</span>
                         </div>
                         <div className="text-slate-400 italic text-sm leading-relaxed">
                            <LatexRenderer text={selectedQ.marking_scheme || "Calculating logic..."} />
                         </div>
                      </div>
                   </div>

                   {/* 4. NAVIGATION BUTTONS */}
                   <div className="flex items-center justify-between gap-4">
                      <Button
                        disabled={currentIdx === 0}
                        onClick={() => setSelectedMcqId(mcqQuestions[currentIdx - 1].id)}
                        className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all font-bold flex-1"
                      >
                         <ChevronLeft className="h-5 w-5 mr-2" />
                         Previous
                      </Button>
                      <Button
                        disabled={currentIdx === mcqQuestions.length - 1}
                        onClick={() => setSelectedMcqId(mcqQuestions[currentIdx + 1].id)}
                        className="h-14 px-8 rounded-2xl bg-primary text-white hover:bg-primary/90 disabled:opacity-30 transition-all font-black flex-1 shadow-lg shadow-primary/20"
                      >
                         Next
                         <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                   </div>
                </div>
             )}
          </div>
        )}

        {/* ── VIEW 3: THEORY REVIEW ── */}
        {view === 'theory' && (
          <div className="space-y-6 animate-in fade-in duration-500">
             <div className="bg-purple-500/5 rounded-[2.5rem] p-10 border border-purple-500/10 flex items-center justify-between mb-10">
              <div className="space-y-1">
                <h3 className="text-3xl font-black text-white">Theory Forensics</h3>
                <p className="text-slate-400 font-medium">Digital scanning and AI logic verification.</p>
              </div>
              <div className="h-20 w-20 rounded-[2rem] bg-purple-500/20 flex flex-col items-center justify-center border border-purple-500/20">
                <span className="text-3xl font-black text-purple-400">{attempt?.theory_score || 0}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">/100</span>
              </div>
            </div>

            <div className="space-y-6">
              {theorySubmissions.map((sub) => (
                <div 
                  key={sub.id}
                  className={`rounded-[3rem] border transition-all duration-500 overflow-hidden ${
                    expandedTheoryId === sub.id ? 'bg-[#030712] border-white/20 shadow-2xl' : 'bg-transparent border-white/5 hover:border-white/10'
                  }`}
                >
                  <button 
                    onClick={() => setExpandedTheoryId(expandedTheoryId === sub.id ? null : sub.id)}
                    className="w-full p-10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-10">
                       <div className="relative">
                          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center font-black text-2xl transition-all ${
                            sub.marks_attained >= 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          } border border-white/5`}>
                            {sub.marks_attained || 0}
                          </div>
                       </div>
                       <div className="text-left">
                          <h4 className="text-xl font-black text-white tracking-tight">Question {sub.question_number}</h4>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Score: {sub.marks_attained} / 10</span>
                       </div>
                    </div>
                    <ChevronDown className={`h-6 w-6 text-slate-600 transition-transform ${expandedTheoryId === sub.id ? 'rotate-180 text-primary' : ''}`} />
                  </button>

                  {expandedTheoryId === sub.id && (
                    <div className="px-10 pb-12 pt-4 animate-in slide-in-from-top-4 duration-500">
                      <div className="grid md:grid-cols-2 gap-10 border-t border-white/10 pt-10">
                        <div className="space-y-4">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Digital Scan
                          </h5>
                          <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-black shadow-2xl group cursor-zoom-in">
                            <img src={sub.image_url} alt="Scan" className="w-full h-auto opacity-80 group-hover:opacity-100 transition-all duration-700" />
                          </div>
                        </div>

                        <div className="space-y-6">
                           <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 relative group overflow-hidden">
                              <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-6">Examiner Reasonings</h5>
                              <div className="text-base text-blue-50/90 leading-relaxed space-y-4 font-medium italic">
                                <LatexRenderer text={sub.feedback || "Detailed step-by-step logic analysis is being processed..."} />
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. GLOBAL FOOTER MOTIVATION (Visible for ALL views except maybe overview if it feels redundant) ── */}
        <section className="mt-24 p-12 rounded-[4rem] border border-white/5 bg-[#030712] text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
            <div className="relative z-10">
            <GraduationCap className="h-12 w-12 text-primary mx-auto mb-6" />
            <h3 className="text-4xl font-black text-white mb-4">Push for the A1.</h3>
            <p className="text-slate-400 font-medium max-w-sm mx-auto mb-10 leading-relaxed text-lg">
                You are currently at the <span className={`font-black ${gradeInfo.color}`}>{gradeInfo.label}</span> level. Strengthen your theory logic to reach the top.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={() => navigate("/dashboard")} className="h-16 px-12 rounded-2xl bg-white text-[#020617] hover:bg-white/90 font-black shadow-xl transition-all w-full sm:w-fit text-lg">
                    Back to Dashboard
                </Button>
            </div>
            </div>
        </section>

      </main>
    </div>
  );
};

export default ExamResults;
