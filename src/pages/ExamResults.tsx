import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  ChevronLeft, List, Eye, Layers, Maximize2
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
  const [selectedTheoryId, setSelectedTheoryId] = useState<string | null>(null);
  const [selectedMcqId, setSelectedMcqId] = useState<string | null>(null);
  const [showMcqGrid, setShowMcqGrid] = useState(false);
  const [showTheoryGrid, setShowTheoryGrid] = useState(false);

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
          .eq('attempt_id', attemptId);
        
        if (theoryData) {
            const sortedTheory = theoryData.sort((a, b) => {
               const nA = parseInt(a.question_number || "0");
               const nB = parseInt(b.question_number || "0");
               return nA - nB;
            });
            setTheorySubmissions(sortedTheory);
            if (sortedTheory.length > 0) setSelectedTheoryId(sortedTheory[0].id);
        }

        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true);
        
        if (qData) {
          const sorted = qData.sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number));
          setMcqQuestions(sorted);
          if (sorted.length > 0) setSelectedMcqId(sorted[0].id);
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

  // Helper to keep selectedTheoryId in sync if submissions change
  useEffect(() => {
    if (theorySubmissions.length > 0 && !selectedTheoryId) {
        setSelectedTheoryId(theorySubmissions[0].id);
    }
  }, [theorySubmissions, selectedTheoryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] p-6 space-y-8 animate-pulse">
        <Skeleton variant="rectangle" className="h-16 w-full rounded-2xl bg-white/5" />
        <Skeleton variant="rectangle" className="h-64 w-full rounded-3xl bg-white/5" />
      </div>
    );
  }

  const gradeInfo = getWassceGrade(attempt?.total_score || 0);

  const getCorrectOptionText = (marking: string, options: any[]) => {
    if (!marking || !options) return null;
    const trimmed = marking.trim().toUpperCase();
    if (["A", "B", "C", "D"].includes(trimmed)) {
        const found = options.find(o => o.id === trimmed);
        return found ? found.text : null;
    }
    const match = marking.match(/Equation:\s*([A-D])\s*=/);
    if (match) {
        const found = options.find(o => o.id === match[1]);
        return found ? found.text : null;
    }
    const clean = (t: string) => String(t).replace(/[^a-z0-9.]/gi, '').toLowerCase();
    const markingClean = clean(marking);
    for (const opt of options) {
        if (clean(opt.text) === markingClean && markingClean !== '') return opt.text;
    }
    for (const opt of options) {
        if (markingClean.includes(clean(opt.text)) && clean(opt.text).length > 1) return opt.text;
    }
    return null;
  };

  const selectedQ = mcqQuestions.find(q => q.id === selectedMcqId);
  const selectedResp = responses.find(r => r.question_id === selectedMcqId);
  const correctText = selectedQ ? getCorrectOptionText(selectedQ.marking_scheme, selectedQ.options || []) : null;
  const isSelectedCorrect = selectedResp && correctText && (selectedResp.selected_option === correctText);
  const currentMcqIdx = mcqQuestions.findIndex(q => q.id === selectedMcqId);

  // Theory logic
  const selectedTheory = theorySubmissions.find(s => s.id === selectedTheoryId);
  const currentTheoryIdx = theorySubmissions.findIndex(s => s.id === selectedTheoryId);

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
          </div>
        )}

        {/* ── VIEW 2: MCQ FORENSICS ── */}
        {view === 'mcq' && (
          <div className="space-y-6 animate-in fade-in duration-500 relative">
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

             {showMcqGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                   <div className="grid grid-cols-5 gap-2">
                      {mcqQuestions.map((q) => {
                         const resp = responses.find(r => r.question_id === q.id);
                         const correctT = getCorrectOptionText(q.marking_scheme, q.options || []);
                         const isCorrect = resp && correctT && (resp.selected_option === correctT);
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

             {selectedQ ? (
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                         {(selectedQ.options || []).map((opt: any) => {
                            const isThisCorrect = (correctText && opt.text === correctText);
                            const wasThisPicked = (selectedResp && opt.text === selectedResp.selected_option);
                            return (
                                <div 
                                  key={opt.id}
                                  className={`p-6 rounded-2xl border flex items-center gap-5 transition-all ${
                                    isThisCorrect ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' : 
                                    wasThisPicked ? 'bg-rose-500/10 border-rose-500/40' : 'bg-white/5 border-white/5 opacity-50'
                                  }`}
                                >
                                   <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm ${
                                      isThisCorrect ? 'bg-emerald-500 text-white' : wasThisPicked ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400'
                                   }`}>
                                      {opt.id}
                                   </div>
                                   <div className="text-base font-bold text-slate-200">
                                      <LatexRenderer text={opt.text} />
                                   </div>
                                   {isThisCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />}
                                   {wasThisPicked && !isThisCorrect && <XCircle className="h-5 w-5 text-rose-400 ml-auto" />}
                                </div>
                            );
                         })}
                      </div>

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

                   <div className="flex items-center justify-between gap-4">
                      <Button
                        disabled={currentMcqIdx === 0}
                        onClick={() => setSelectedMcqId(mcqQuestions[currentMcqIdx - 1].id)}
                        className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all font-bold flex-1"
                      >
                         <ChevronLeft className="h-5 w-5 mr-2" />
                         Previous
                      </Button>
                      <Button
                        disabled={currentMcqIdx === mcqQuestions.length - 1}
                        onClick={() => setSelectedMcqId(mcqQuestions[currentMcqIdx + 1].id)}
                        className="h-14 px-8 rounded-2xl bg-primary text-white hover:bg-primary/90 disabled:opacity-30 transition-all font-black flex-1 shadow-lg shadow-primary/20"
                      >
                         Next
                         <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                   </div>
                </div>
             ) : (
                <div className="p-20 text-center opacity-40">
                   <Search className="h-16 w-16 mx-auto mb-6" />
                   <p className="text-xl font-black uppercase tracking-widest">No Objectives Recorded</p>
                </div>
             )}
          </div>
        )}

        {/* ── VIEW 3: THEORY FORENSICS ── */}
        {view === 'theory' && (
          <div className="space-y-8 animate-in fade-in duration-500 relative">
             
             {/* 1. SELECTOR BUTTON */}
             <div className="flex justify-center">
                <button 
                  onClick={() => setShowTheoryGrid(!showTheoryGrid)}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/20 transition-all active:scale-95 shadow-lg shadow-purple-500/5"
                >
                   <Layers className="h-3 w-3" />
                   <span>Theory Navigator</span>
                   <ChevronDown className={`h-3 w-3 transition-transform ${showTheoryGrid ? 'rotate-180' : ''}`} />
                </button>
             </div>

             {/* 2. GRID SELECTOR */}
             {showTheoryGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                   <div className="grid grid-cols-4 gap-3">
                      {theorySubmissions.map((sub) => {
                         const isSelected = selectedTheoryId === sub.id;
                         const isGood = (sub.marks_attained || 0) >= 5;
                         return (
                            <button
                               key={sub.id}
                               onClick={() => {
                                  setSelectedTheoryId(sub.id);
                                  setShowTheoryGrid(false);
                               }}
                               className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all ${
                                  isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''
                               } ${
                                  isGood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                               }`}
                            >
                               <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Q{sub.question_number}</span>
                               <span className="text-sm font-black">{sub.marks_attained || 0}</span>
                            </button>
                         );
                      })}
                   </div>
                </div>
             )}

             {/* 3. SPLIT FORENSIC VIEWPORT */}
             {selectedTheory ? (
                <div className="space-y-12">
                   <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                      
                      {/* DIGITAL SCAN (LEFT - 3/5) */}
                      <div className="lg:col-span-3 space-y-4">
                         <div className="flex items-center justify-between mb-4 px-2">
                            <div className="flex items-center gap-3">
                               <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                                  <Eye className="h-4 w-4 text-primary" />
                               </div>
                               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Digital Lightbox Scan</span>
                            </div>
                         </div>
                         
                         <div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-3xl group relative">
                            <img 
                              src={selectedTheory.image_url} 
                              alt="Submission Scan" 
                              className="w-full h-auto object-contain min-h-[400px] max-h-[600px] transition-all duration-700 filter brightness-110 contrast-[1.05]" 
                            />
                         </div>
                      </div>

                      {/* AI LOGIC & SCORE (RIGHT - 2/5) */}
                      <div className="lg:col-span-2 space-y-6">
                         <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-xl flex flex-col items-center text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Question {selectedTheory.question_number} Score</span>
                            <div className="relative h-24 w-24 flex items-center justify-center mb-2">
                               <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${selectedTheory.marks_attained >= 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                               <span className={`text-5xl font-black relative ${selectedTheory.marks_attained >= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {selectedTheory.marks_attained || 0}
                               </span>
                            </div>
                            <span className="text-xs font-bold text-slate-600">Marks out of 10.0</span>
                         </div>

                         <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 shadow-xl relative overflow-hidden group">
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8">AI Logic Verification</h5>
                            <div className="text-base text-slate-300 leading-relaxed font-medium italic space-y-6">
                               <LatexRenderer text={selectedTheory.feedback || "Detailed step-by-step logic analysis is being processed..."} />
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center justify-between gap-4">
                      <Button
                        disabled={currentTheoryIdx <= 0}
                        onClick={() => setSelectedTheoryId(theorySubmissions[currentTheoryIdx - 1].id)}
                        className="h-16 px-10 rounded-[1.5rem] bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-30 transition-all font-bold flex-1"
                      >
                         <ChevronLeft className="h-5 w-5 mr-2" />
                         Prev Question
                      </Button>
                      <Button
                        disabled={currentTheoryIdx >= theorySubmissions.length - 1}
                        onClick={() => setSelectedTheoryId(theorySubmissions[currentTheoryIdx + 1].id)}
                        className="h-16 px-10 rounded-[1.5rem] bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-30 transition-all font-black flex-1 shadow-lg shadow-purple-500/20"
                      >
                         Next Question
                         <ChevronRight className="h-5 w-5 ml-2" />
                      </Button>
                   </div>
                </div>
             ) : (
                <div className="p-24 text-center">
                   <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10">
                      <Layers className="h-10 w-10 text-slate-500 animate-pulse" />
                   </div>
                   <h3 className="text-2xl font-black text-white mb-2">No Workings Found</h3>
                   <p className="text-slate-500 font-medium max-w-sm mx-auto">Either theory images haven't been uploaded yet, or the forensic scan is still processing.</p>
                </div>
             )}
          </div>
        )}

      </main>
    </div>
  );
};

export default ExamResults;
