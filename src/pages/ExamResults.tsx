import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  ChevronLeft, List, Eye, Layers, Maximize2, RefreshCw, Terminal, Zap
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
  const [refreshing, setRefreshing] = useState(false);
  const [gradingMcq, setGradingMcq] = useState(false);
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
  
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }
    fetchResults();
  }, [attemptId]);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const fetchResults = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const { data: attData, error: attErr } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attErr) throw attErr;

      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);

        const { data: theoryData } = await supabase
          .from('theory_submissions')
          .select('*')
          .eq('attempt_id', attemptId);
        
        if (theoryData && theoryData.length > 0) {
            const sortedTheory = [...theoryData].sort((a, b) => {
               const nA = parseInt(a.question_number || a.feedback || "0");
               const nB = parseInt(b.question_number || b.feedback || "0");
               return nA - nB;
            });
            setTheorySubmissions(sortedTheory);
            if (!selectedTheoryId) setSelectedTheoryId(sortedTheory[0].id);
        } else {
            setTheorySubmissions([]);
        }

        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('exam_id', attData.exam_id)
          .eq('is_mcq', true);
        
        if (qData) {
          const sorted = qData.sort((a, b) => parseInt(a.question_number) - parseInt(b.question_number));
          setMcqQuestions(sorted);
          if (sorted.length > 0 && !selectedMcqId) setSelectedMcqId(sorted[0].id);
        }

        const { data: respData } = await supabase
          .from('exam_responses')
          .select('*')
          .eq('attempt_id', attemptId);
        if (respData) setResponses(respData);
      }
    } catch (err: any) {
      addLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegradeMcq = async () => {
    try {
      setGradingMcq(true);
      addLog("Triggering backend re-grade for MCQs...");
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/attempts/${attemptId}/grade-mcq`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error("Backend grading failed");
      
      addLog("Backend grading successful. Refreshing data...");
      await fetchResults(true);
    } catch (err: any) {
      addLog(`Regrade Error: ${err.message}`);
      alert("Failed to re-calculate score. Please try again.");
    } finally {
      setGradingMcq(false);
    }
  };

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

  const selectedTheory = theorySubmissions.find(s => s.id === selectedTheoryId);
  const currentTheoryIdx = theorySubmissions.findIndex(s => s.id === selectedTheoryId);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-50 font-inter selection:bg-primary/30 pb-20">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#020617]/70 border-b border-white/5">
        <div className="container max-w-4xl h-16 flex items-center justify-between px-4 mx-auto">
          <button onClick={() => navigate("/dashboard")} className="group flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-all">
            <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/10 transition-all"><ArrowLeft className="h-4 w-4" /></div>
            <span>Dashboard</span>
          </button>
          <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] font-black text-slate-500 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
             <Terminal className="h-3 w-3" /> System Log
          </button>
        </div>
      </header>

      {showDebug && (
        <div className="bg-black/80 backdrop-blur-md border-b border-white/10 p-6 font-mono text-[10px] text-emerald-400 overflow-y-auto max-h-40 animate-in slide-in-from-top-4 duration-300">
           {debugLog.map((log, i) => <div key={i}>{log}</div>)}
        </div>
      )}

      <main className="relative z-10 container max-w-4xl px-4 pt-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-10 w-fit mx-auto sm:mx-0">
          {(['overview', 'mcq', 'theory'] as const).map((t) => (
            <button key={t} onClick={() => setView(t)} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${view === t ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>

        {view === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 relative p-10 sm:p-14 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl bg-[#030712]/40 backdrop-blur-xl">
                 <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                    <div className="relative h-40 w-40 flex items-center justify-center">
                       <svg className="h-full w-full rotate-[-90deg]"><circle cx="80" cy="80" r="72" className="fill-none stroke-white/5 stroke-[6]" /><circle cx="80" cy="80" r="72" className="fill-none stroke-primary stroke-[8]" style={{ strokeDasharray: 452, strokeDashoffset: 452 - (452 * (attempt?.total_score || 0)) / 100 }} strokeLinecap="round" /></svg>
                       <div className="absolute flex flex-col items-center"><span className={`text-5xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{gradeInfo.label}</span></div>
                    </div>
                    <div className="flex-1 text-center md:text-left">
                       <h2 className="text-4xl font-black text-white mb-2 leading-tight">Mastered Logic.</h2>
                       <p className="text-slate-400 font-medium mb-6">Your forensic breakdown for {exam?.subject} is ready.</p>
                       <div className="flex flex-wrap justify-center md:justify-start gap-4">
                          <div className="px-6 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-widest">{attempt?.total_score || 0}% Final</div>
                          <Button onClick={handleRegradeMcq} disabled={gradingMcq} className="h-8 px-4 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-white/10">
                             <Zap className={`h-3 w-3 mr-2 ${gradingMcq ? 'animate-pulse' : ''}`} />
                             {gradingMcq ? 'Re-calculating...' : 'Sync Live Score'}
                          </Button>
                       </div>
                    </div>
                 </div>
              </div>
              <div className="space-y-4">
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full"><Brain className="h-6 w-6 text-purple-400 mb-4" /><div><span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Theory Score</span><span className="text-3xl font-black text-white">{attempt?.theory_score || 0}<span className="text-sm text-slate-500 font-bold">/100</span></span></div></div>
                 <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 flex flex-col justify-between h-full"><Target className="h-6 w-6 text-emerald-400 mb-4" /><div><span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">MCQ Score</span><span className="text-3xl font-black text-white">{attempt?.mcq_score || 0}<span className="text-sm text-slate-500 font-bold">/50</span></span></div></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
               <Button onClick={() => setView('mcq')} className="h-20 rounded-[1.5rem] bg-white/5 border border-white/10 hover:bg-white/10 group px-8 justify-between">
                  <div className="flex flex-col items-start text-left"><span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Objectives</span><span className="text-base font-black text-slate-200">Review Errors</span></div>
                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-primary transition-colors" />
               </Button>
               <Button onClick={() => setView('theory')} className="h-20 rounded-[1.5rem] bg-primary/10 border border-primary/20 hover:bg-primary/20 group px-8 justify-between">
                  <div className="flex flex-col items-start text-left"><span className="text-[10px] font-black text-primary uppercase tracking-widest">Theory Map</span><span className="text-base font-black text-slate-200">Step-by-Step Logic</span></div>
                  <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
               </Button>
            </div>
          </div>
        )}

        {view === 'mcq' && (
          <div className="space-y-6 animate-in fade-in duration-500 relative">
             <div className="flex justify-center mb-4">
                <button onClick={() => setShowMcqGrid(!showMcqGrid)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10"><List className="h-3 w-3" /><span>Select Question</span><ChevronDown className={`h-3 w-3 transition-transform ${showMcqGrid ? 'rotate-180' : ''}`} /></button>
             </div>
             {showMcqGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                   <div className="grid grid-cols-5 gap-2">
                      {mcqQuestions.map((q) => {
                         const resp = responses.find(r => r.question_id === q.id);
                         const correctT = getCorrectOptionText(q.marking_scheme, q.options || []);
                         const isCorrect = resp && correctT && (resp.selected_option === correctT);
                         return (<button key={q.id} onClick={() => { setSelectedMcqId(q.id); setShowMcqGrid(false); }} className={`h-10 rounded-lg flex items-center justify-center font-black text-xs ${selectedMcqId === q.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''} ${!resp ? 'bg-white/5 text-slate-600' : isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>{q.question_number}</button>);
                      })}
                   </div>
                </div>
             )}
             {selectedQ ? (
                <div className="space-y-12">
                   <div className="p-8 sm:p-12 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between mb-10"><div className="flex items-center gap-4"><div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">Q{selectedQ.question_number}</div><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Forensic Analysis</span></div><div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isSelectedCorrect ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>{isSelectedCorrect ? 'Correct Path' : 'Logic Mismatch'}</div></div>
                      <div className="text-2xl font-bold text-white mb-10 leading-relaxed"><LatexRenderer text={selectedQ.question_text} /></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                         {(selectedQ.options || []).map((opt: any) => {
                            const isThisCorrect = (correctText && opt.text === correctText);
                            const wasThisPicked = (selectedResp && opt.text === selectedResp.selected_option);
                            return (<div key={opt.id} className={`p-6 rounded-2xl border flex items-center gap-5 transition-all ${isThisCorrect ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' : wasThisPicked ? 'bg-rose-500/10 border-rose-500/40' : 'bg-white/5 border-white/5 opacity-50'}`}><div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm ${isThisCorrect ? 'bg-emerald-500 text-white' : wasThisPicked ? 'bg-rose-500 text-white' : 'bg-white/10 text-slate-400'}`}>{opt.id}</div><div className="text-base font-bold text-slate-200"><LatexRenderer text={opt.text} /></div>{isThisCorrect && <CheckCircle2 className="h-5 w-5 text-emerald-400 ml-auto" />}{wasThisPicked && !isThisCorrect && <XCircle className="h-5 w-5 text-rose-400 ml-auto" />}</div>);
                         })}
                      </div>
                   </div>
                   <div className="flex items-center justify-between gap-4"><Button disabled={currentMcqIdx === 0} onClick={() => setSelectedMcqId(mcqQuestions[currentMcqIdx - 1].id)} className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 flex-1"><ChevronLeft className="h-5 w-5 mr-2" /> Previous</Button><Button disabled={currentMcqIdx === mcqQuestions.length - 1} onClick={() => setSelectedMcqId(mcqQuestions[currentMcqIdx + 1].id)} className="h-14 px-8 rounded-2xl bg-primary text-white hover:bg-primary/90 flex-1 shadow-lg shadow-primary/20">Next <ChevronRight className="h-5 w-5 ml-2" /></Button></div>
                </div>
             ) : (<div className="p-20 text-center opacity-40"><Search className="h-16 w-16 mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No Objectives Recorded</p></div>)}
          </div>
        )}

        {view === 'theory' && (
          <div className="space-y-8 animate-in fade-in duration-500 relative">
             <div className="flex justify-center gap-4">
                <button onClick={() => setShowTheoryGrid(!showTheoryGrid)} className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/20"><Layers className="h-3 w-3" /><span>Theory Navigator</span><ChevronDown className={`h-3 w-3 transition-transform ${showTheoryGrid ? 'rotate-180' : ''}`} /></button>
                <button onClick={() => fetchResults(true)} disabled={refreshing} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10"><RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /><span>Refresh</span></button>
             </div>
             {showTheoryGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl">
                   <div className="grid grid-cols-4 gap-3">
                      {theorySubmissions.map((sub) => (<button key={sub.id} onClick={() => { setSelectedTheoryId(sub.id); setShowTheoryGrid(false); }} className={`h-12 rounded-xl flex flex-col items-center justify-center ${selectedTheoryId === sub.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''} ${(sub.marks_attained || 0) >= 5 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}><span className="text-[10px] font-black uppercase tracking-widest opacity-50">Q{sub.question_number || 'Scan'}</span><span className="text-sm font-black">{sub.marks_attained || 0}</span></button>))}
                   </div>
                </div>
             )}
             {selectedTheory ? (
                <div className="space-y-12">
                   <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                      <div className="lg:col-span-3 space-y-4"><div className="rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-3xl"><img src={selectedTheory.image_url} alt="Submission Scan" className="w-full h-auto object-contain min-h-[400px] max-h-[600px] filter brightness-110 contrast-[1.05]" /></div></div>
                      <div className="lg:col-span-2 space-y-6">
                         <div className="p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 shadow-xl flex flex-col items-center text-center"><span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">Question {selectedTheory.question_number || 'Analysis'} Score</span><div className="relative h-24 w-24 flex items-center justify-center mb-2"><div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${selectedTheory.marks_attained >= 5 ? 'bg-emerald-500' : 'bg-rose-500'}`} /><span className={`text-5xl font-black relative ${selectedTheory.marks_attained >= 5 ? 'text-emerald-400' : 'text-rose-400'}`}>{selectedTheory.marks_attained || 0}</span></div></div>
                         <div className="p-10 rounded-[2.5rem] bg-primary/5 border border-primary/10 shadow-xl"><h5 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-8">AI Logic Verification</h5><div className="text-base text-slate-300 leading-relaxed font-medium italic space-y-6"><LatexRenderer text={selectedTheory.feedback || "Detailed step-by-step logic analysis is being processed..."} /></div></div>
                      </div>
                   </div>
                   <div className="flex items-center justify-between gap-4"><Button disabled={currentTheoryIdx <= 0} onClick={() => setSelectedTheoryId(theorySubmissions[currentTheoryIdx - 1].id)} className="h-16 px-10 rounded-[1.5rem] bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 flex-1"><ChevronLeft className="h-5 w-5 mr-2" /> Prev Question</Button><Button disabled={currentTheoryIdx >= theorySubmissions.length - 1} onClick={() => setSelectedTheoryId(theorySubmissions[currentTheoryIdx + 1].id)} className="h-16 px-10 rounded-[1.5rem] bg-purple-600 text-white hover:bg-purple-500 flex-1 shadow-lg shadow-purple-500/20">Next Question <ChevronRight className="h-5 w-5 ml-2" /></Button></div>
                </div>
             ) : (<div className="p-24 text-center"><div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10"><Layers className={`h-10 w-10 text-slate-500 ${refreshing ? 'animate-spin' : 'animate-pulse'}`} /></div><h3 className="text-2xl font-black text-white mb-2">{refreshing ? 'Refetching Data...' : 'No Workings Found'}</h3><p className="text-slate-500 font-medium max-w-sm mx-auto">{refreshing ? 'Checking the forensic database for your theory submissions...' : "Either theory images haven't been uploaded yet, or the forensic scan is still processing. Try refreshing."}</p>{!refreshing && <Button onClick={() => fetchResults(true)} className="mt-8 h-14 px-8 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20">Retry Forensic Scan</Button>}</div>)}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamResults;
