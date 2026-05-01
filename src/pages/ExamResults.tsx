import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  Award, ArrowLeft, Download, Share2, Target, Brain,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
  Search, Sparkles, LayoutDashboard,
  FileText, XCircle, Info, ChevronRight,
  TrendingUp, Clock, BookOpen, GraduationCap,
  ChevronLeft, List, Eye, Layers, Maximize2, RefreshCw, Terminal, Zap,
  Cpu, ShieldCheck, Activity
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
  if (score >= 50) return { grade: "C6", label: "Credit", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  if (score >= 45) return { grade: "D7", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  if (score >= 40) return { grade: "E8", label: "Pass", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
  return { grade: "F9", label: "Fail", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" };
};

const ExamResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  const attemptId = (location.state as any)?.attemptId || searchParams.get('attemptId');

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

  const syncTriggered = useRef(false);

  const addLog = (msg: string) => {
    console.log(`[SYSTEM LOG]: ${msg}`);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    if (!attemptId) {
      navigate("/dashboard");
      return;
    }
    fetchResults();
  }, [attemptId]);

  const fetchResults = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      addLog(`Syncing Attempt: ${attemptId}`);

      const { data: attData, error: attErr } = await supabase
        .from('exam_attempts')
        .select('*, exams(*)')
        .eq('id', attemptId)
        .single();

      if (attErr) {
          addLog(`Attempt Fetch Error: ${attErr.message} (Code: ${attErr.code})`);
          throw attErr;
      }

      if (attData) {
        setAttempt(attData);
        setExam(attData.exams);

        // PROXY FETCH: Use backend to bypass RLS
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
        const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
        
        const theoryResponse = await fetch(`${cleanBaseUrl}/api/v1/attempts/${attemptId}/theory-submissions`);
        const theoryData = theoryResponse.ok ? await theoryResponse.json() : [];
        
        addLog(`Forensic Sync: ${theoryData?.length || 0} Theory Rows Verified`);

        if (theoryData && theoryData.length > 0) {
            const sortedTheory = [...theoryData].sort((a, b) => {
               const nA = parseInt(a.question_number || a.feedback || "0") || 0;
               const nB = parseInt(b.question_number || b.feedback || "0") || 0;
               return nA - nB;
            });
            setTheorySubmissions(sortedTheory);
            if (!selectedTheoryId || !sortedTheory.find(s => s.id === selectedTheoryId)) {
                setSelectedTheoryId(sortedTheory[0].id);
            }
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

        if (!syncTriggered.current && attData.status !== 'graded' && respData && respData.length > 0) {
           syncTriggered.current = true;
           handleRegradeMcq();
        }
      }
    } catch (err: any) {
      addLog(`CRITICAL FETCH ERROR: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRegradeMcq = async () => {
    try {
      if (!attemptId) return;
      setGradingMcq(true);
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
      const endpoint = `${cleanBaseUrl}/api/v1/attempts/${attemptId}/grade-mcq`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const { data: reData } = await supabase.from('exam_attempts').select('*, exams(*)').eq('id', attemptId).single();
        if (reData) setAttempt(reData);
      }
    } catch (err: any) {
      addLog(`Auto-Sync Error: ${err.message}`);
    } finally {
      setGradingMcq(false);
    }
  };

  const handleRegradeTheory = async () => {
      try {
          setRefreshing(true);
          addLog("Re-triggering Theory Grader...");
          const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
          const cleanBaseUrl = backendUrl.endsWith('/') ? backendUrl.slice(0, -1) : backendUrl;
          const endpoint = `${cleanBaseUrl}/api/v1/attempts/${attemptId}/grade`;
          
          const response = await fetch(endpoint, { method: 'POST' });
          if (response.ok) {
              addLog("Theory Grader initiated. Waiting 8 seconds for AI reasoning...");
              // Poll twice
              setTimeout(() => fetchResults(true), 4000);
              setTimeout(() => fetchResults(true), 8000);
          } else {
              addLog("Theory Grader failed to start.");
          }
      } catch (err: any) {
          addLog(`Theory Grade Error: ${err.message}`);
      } finally {
          setRefreshing(false);
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
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="flex items-center gap-2">
            {gradingMcq && <Activity className="h-3 w-3 text-primary animate-pulse" />}
            <button onClick={() => setShowDebug(!showDebug)} className="text-[10px] font-black text-slate-500 flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5 transition-all active:scale-95">
               <Terminal className="h-3 w-3" /> <span className="hidden sm:inline">System Log</span>
            </button>
          </div>
        </div>
      </header>

      {showDebug && (
        <div className="bg-black/90 backdrop-blur-md border-b border-white/10 p-6 font-mono text-[10px] text-emerald-400 overflow-y-auto max-h-60 animate-in slide-in-from-top-4 duration-300 shadow-2xl relative z-[100]">
           <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 font-bold uppercase tracking-widest">Diagnostic Console</span>
              <Button onClick={() => setDebugLog([])} className="h-6 px-3 bg-white/5 text-[10px] rounded-md">Clear</Button>
           </div>
           {debugLog.map((log, i) => <div key={i} className="mb-1 border-l border-white/10 pl-2">{log}</div>)}
        </div>
      )}

      <main className="relative z-10 container max-w-4xl px-4 pt-10 mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 mb-10 w-full sm:w-fit mx-auto sm:mx-0 overflow-x-auto no-scrollbar">
          {(['overview', 'mcq', 'theory'] as const).map((t) => (
            <button key={t} onClick={() => setView(t)} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${view === t ? 'bg-primary text-white shadow-lg' : 'text-slate-500'}`}>{t}</button>
          ))}
        </div>

        {view === 'overview' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="relative p-10 sm:p-14 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl bg-[#030712]/40 backdrop-blur-xl">
               <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50" />
               <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                  <div className="relative h-40 w-40 flex items-center justify-center shrink-0">
                     <svg className="h-full w-full rotate-[-90deg]">
                        <circle cx="80" cy="80" r="72" className="fill-none stroke-white/5 stroke-[6]" />
                        <circle cx="80" cy="80" r="72" className="fill-none stroke-primary stroke-[8] transition-all duration-1000" style={{ strokeDasharray: 452, strokeDashoffset: 452 - (452 * (attempt?.total_score || 0)) / 100 }} strokeLinecap="round" />
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-8 hover:bg-white/[0.05] transition-all">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Brain className="h-16 w-16 text-purple-400" /></div>
                  <div className="relative z-10">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Theory Analytics</span>
                    <div className="flex items-end gap-3 mb-6"><span className="text-5xl font-black text-white leading-none">{attempt?.theory_score || 0}</span><span className="text-sm font-bold text-slate-500 mb-1">/ 100 PTS</span></div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-500 rounded-full transition-all duration-1000" style={{ width: `${attempt?.theory_score || 0}%` }} /></div>
                  </div>
               </div>
               <div className="relative group overflow-hidden rounded-[2.5rem] bg-white/[0.03] border border-white/10 p-8 hover:bg-white/[0.05] transition-all">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Target className="h-16 w-16 text-emerald-400" /></div>
                  <div className="relative z-10">
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Objective Precision</span>
                    <div className="flex items-end gap-3 mb-6"><span className="text-5xl font-black text-white leading-none">{attempt?.mcq_score || 0}</span><span className="text-sm font-bold text-slate-500 mb-1">/ 50 PTS</span></div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${((attempt?.mcq_score || 0) / 50) * 100}%` }} /></div>
                  </div>
               </div>
            </div>
            <div className="flex flex-col gap-4 mt-8">
               <button onClick={() => setView('mcq')} className="w-full p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 active:scale-[0.98] transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-6"><div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors"><ShieldCheck className="h-7 w-7 text-primary" /></div><div className="text-left"><h4 className="text-lg font-black text-white">Review Mistakes</h4><p className="text-xs font-medium text-slate-500 uppercase tracking-widest">Verify Logic Gaps</p></div></div>
                  <ChevronRight className="h-6 w-6 text-slate-700 group-hover:text-primary transition-colors" />
               </button>
               <button onClick={() => setView('theory')} className="w-full p-8 rounded-[2rem] bg-primary/10 border border-primary/20 hover:bg-primary/20 active:scale-[0.98] transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-6"><div className="h-14 w-14 rounded-2xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors"><Cpu className="h-7 w-7 text-purple-400" /></div><div className="text-left"><h4 className="text-lg font-black text-white">Forensic Theory Map</h4><p className="text-xs font-medium text-purple-400 uppercase tracking-widest">AI Scoring Reasoning</p></div></div>
                  <ChevronRight className="h-6 w-6 text-slate-700 group-hover:text-purple-400 transition-colors" />
               </button>
            </div>
          </div>
        )}

        {view === 'mcq' && (
          <div className="space-y-6 animate-in fade-in duration-500 relative">
             <div className="flex justify-center mb-4"><button onClick={() => setShowMcqGrid(!showMcqGrid)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all"><List className="h-3 w-3" /><span>Select Question</span><ChevronDown className={`h-3 w-3 transition-transform ${showMcqGrid ? 'rotate-180' : ''}`} /></button></div>
             {showMcqGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                   <div className="grid grid-cols-5 gap-2">
                      {mcqQuestions.map((q) => {
                         const resp = responses.find(r => r.question_id === q.id);
                         const correctT = getCorrectOptionText(q.marking_scheme, q.options || []);
                         const isCorrect = resp && correctT && (resp.selected_option === correctT);
                         return (<button key={q.id} onClick={() => { setSelectedMcqId(q.id); setShowMcqGrid(false); }} className={`h-10 rounded-lg flex items-center justify-center font-black text-xs transition-all ${selectedMcqId === q.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''} ${!resp ? 'bg-white/5 text-slate-600' : isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/20 text-rose-400 border border-rose-500/20'}`}>{q.question_number}</button>);
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
                    <div className="flex items-center justify-between gap-4">
                      <button 
                        disabled={currentMcqIdx === 0} 
                        onClick={() => {
                          setSelectedMcqId(mcqQuestions[currentMcqIdx - 1].id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-20 flex-1 transition-all flex items-center justify-center font-bold"
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" /> Previous
                      </button>
                      
                      <button 
                        disabled={currentMcqIdx === mcqQuestions.length - 1} 
                        onClick={() => {
                          setSelectedMcqId(mcqQuestions[currentMcqIdx + 1].id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="h-14 px-8 rounded-2xl bg-primary text-white hover:bg-primary/90 disabled:opacity-20 flex-1 shadow-lg shadow-primary/20 transition-all flex items-center justify-center font-bold"
                      >
                        Next <ChevronRight className="h-5 w-5 ml-2" />
                      </button>
                    </div>
                </div>
             ) : (<div className="p-20 text-center opacity-40"><Search className="h-16 w-16 mx-auto mb-6" /><p className="text-xl font-black uppercase tracking-widest">No Objectives Recorded</p></div>)}
          </div>
        )}

        {view === 'theory' && (
          <div className="space-y-8 animate-in fade-in duration-500 relative">
             <div className="flex flex-wrap justify-center gap-4">
                <button onClick={() => setShowTheoryGrid(!showTheoryGrid)} className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-500/20 transition-all"><Layers className="h-3 w-3" /><span>Theory Navigator</span><ChevronDown className={`h-3 w-3 transition-transform ${showTheoryGrid ? 'rotate-180' : ''}`} /></button>
                <button onClick={() => fetchResults(true)} disabled={refreshing} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all"><RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} /><span>Sync</span></button>
                <button onClick={handleRegradeTheory} disabled={refreshing} className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/20 transition-all"><Zap className={`h-3 w-3 ${refreshing ? 'animate-pulse' : ''}`} /><span>Re-run AI Analysis</span></button>
             </div>
             {showTheoryGrid && (
                <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md bg-[#030712] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in zoom-in duration-200">
                   <div className="grid grid-cols-4 gap-3">
                      {theorySubmissions.map((sub) => (<button key={sub.id} onClick={() => { setSelectedTheoryId(sub.id); setShowTheoryGrid(false); }} className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all ${selectedTheoryId === sub.id ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#030712]' : ''} ${(sub.marks_attained || 0) >= 5 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}><span className="text-[10px] font-black uppercase tracking-widest opacity-50">Q{sub.question_number || 'Scan'}</span><span className="text-sm font-black">{sub.marks_attained || 0}</span></button>))}
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
                    <div className="flex items-center justify-between gap-4">
                      <button 
                        disabled={currentTheoryIdx <= 0} 
                        onClick={() => {
                          setSelectedTheoryId(theorySubmissions[currentTheoryIdx - 1].id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="h-16 px-10 rounded-[1.5rem] bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-20 flex-1 transition-all flex items-center justify-center font-bold"
                      >
                        <ChevronLeft className="h-5 w-5 mr-2" /> Prev Question
                      </button>
                      
                      <button 
                        disabled={currentTheoryIdx >= theorySubmissions.length - 1} 
                        onClick={() => {
                          setSelectedTheoryId(theorySubmissions[currentTheoryIdx + 1].id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} 
                        className="h-16 px-10 rounded-[1.5rem] bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-20 flex-1 shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center font-bold"
                      >
                        Next Question <ChevronRight className="h-5 w-5 ml-2" />
                      </button>
                    </div>
                </div>
             ) : (
                <div className="p-24 text-center">
                   <div className="h-20 w-20 rounded-[2rem] bg-white/5 flex items-center justify-center mx-auto mb-8 border border-white/10"><Layers className={`h-10 w-10 text-slate-500 ${refreshing ? 'animate-spin' : 'animate-pulse'}`} /></div>
                   <h3 className="text-2xl font-black text-white mb-2">{refreshing ? 'Refetching Data...' : 'No Workings Found'}</h3>
                   <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">{refreshing ? 'Checking the forensic database for your theory submissions...' : "Either theory images haven't been uploaded yet, or the forensic scan is still processing."}</p>
                   {!refreshing && (
                      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                         <Button onClick={() => fetchResults(true)} className="h-14 px-8 rounded-2xl bg-white/5 border border-white/10 text-slate-400 font-black">Manual Refresh</Button>
                         <Button onClick={handleRegradeTheory} className="h-14 px-8 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20">Trigger Forensic AI Scan</Button>
                      </div>
                   )}
                </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
};

export default ExamResults;
