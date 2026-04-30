import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, AlertTriangle, X, Camera, CheckCircle2, ChevronLeft, ChevronRight, LayoutGrid, UploadCloud, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import LatexRenderer from "@/components/LatexRenderer";
import Skeleton from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";

const TheoryExam = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { examId?: string, attemptId?: string } | null;
  const examId = state?.examId;
  const attemptId = state?.attemptId;

  const [questions, setQuestions] = useState<any[]>([]);
  const [examMetadata, setExamMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // 'reading' -> taking the exam, 'uploading' -> snapping pictures
  const [mode, setMode] = useState<'reading' | 'uploading'>('reading');
  
  // Reading mode state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);

  // Timer state 
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showStartUploadConfirm, setShowStartUploadConfirm] = useState(false);

  // Upload state
  const [uploadQueue, setUploadQueue] = useState<{file: File, id: string, progress: number, url?: string}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

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
        .eq('is_mcq', false);
        
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
    const EXAM_KEY = `acewassce_theory_timer_${examId}`;
    const savedEndTime = localStorage.getItem(EXAM_KEY);
    const DURATION = examMetadata.theory_duration || 9000;

    if (savedEndTime) {
      const remaining = Math.max(0, Math.floor((parseInt(savedEndTime) - Date.now()) / 1000));
      setTimeLeft(remaining);
    } else {
      const endTime = Date.now() + DURATION * 1000;
      localStorage.setItem(EXAM_KEY, endTime.toString());
      setTimeLeft(DURATION);
    }

    if (mode !== 'reading') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem(EXAM_KEY);
          alert("Time is up! Please drop your pens. Beginning the structured upload sequence.");
          setMode('uploading');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode, isLoading, examMetadata]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  };

  const handleEndReading = () => {
    console.log("Ending reading mode, opening upload confirmation...");
    setShowStartUploadConfirm(true);
  };

  const handleCaptureImage = () => {
    if (!attemptId) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const newId = Math.random().toString(36).substr(2, 9);
      setUploadQueue(prev => [...prev, { file, id: newId, progress: 0 }]);
      
      // Start background upload
      processUpload(file, newId);
    };

    input.click();
  };

  const processUpload = async (file: File, id: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/attempts/${attemptId}/upload-working?is_general=true`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      if (result.status === 'success') {
        setUploadQueue(prev => prev.map(item => 
          item.id === id ? { ...item, progress: 100, url: result.image_url } : item
        ));
      }
    } catch (err) {
      console.error("Background upload failed:", err);
      setUploadQueue(prev => prev.filter(item => item.id !== id));
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleFinishAll = async () => {
    if (!attemptId) return;
    
    const allDone = uploadQueue.every(item => item.progress === 100);
    if (!allDone) {
      alert("Please wait for all images to finish uploading.");
      return;
    }

    setIsSubmitting(true);
    localStorage.removeItem(`acewassce_theory_timer_${examId}`);
    
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/attempts/${attemptId}/grade`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error("Failed to trigger AI grading");
      navigate("/exam/theory-success", { state: { attemptId } });
    } catch (err) {
      console.error("Finalization error:", err);
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-10 animate-pulse mt-12">
          <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
          <div className="space-y-4">
            <Skeleton variant="rectangle" className="h-6 w-32 rounded-full" />
            <Skeleton variant="text" className="h-12 w-full" />
            <Skeleton variant="text" className="h-12 w-2/3" />
          </div>
          <div className="space-y-4 mt-12">
            <Skeleton variant="rectangle" className="h-40 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-8">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-emerald-500/20 border-t-emerald-500 shadow-glow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Upload className="h-8 w-8 text-emerald-500 animate-bounce" />
          </div>
        </div>
        <h2 className="font-display text-2xl font-extrabold text-white mb-2 uppercase tracking-tight">Syncing Papers...</h2>
        <p className="text-muted-foreground animate-pulse font-medium">Securing your answers on our servers</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
       <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-6 p-4 rounded-full bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-10 w-10 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-white mb-2">No Theory Questions</h2>
        <p className="text-muted-foreground mb-8">This exam entry hasn't been uploaded yet.</p>
        <button onClick={() => navigate('/practice')} className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors">
          Explore Other Subjects
        </button>
      </div>
    )
  }

  // ----------------------------------------------------
  // READING/EXAM MODE
  // ----------------------------------------------------
  if (mode === 'reading') {
    const question = questions[currentIdx];

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col pb-24 overflow-x-hidden">
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
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exam Timer</span>
              <div className={`flex items-center gap-1.5 font-display text-lg font-extrabold ${timeLeft < 600 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
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

        <main className="flex-1 container max-w-3xl px-4 py-8 animate-fade-up">
          <div className="flex flex-col gap-8 max-w-full">
            {/* INSTRUCTIONS DROPDOWN */}
            <div className={`bg-blue-500/5 border border-blue-500/10 rounded-xl overflow-hidden transition-all duration-300 ${showInstructions ? 'pb-4' : 'pb-0'}`}>
              <button 
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-3 sm:p-4 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 h-6 w-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <span className="font-bold text-[10px]">i</span>
                  </span>
                  <p className="font-display font-bold text-blue-400 text-xs sm:text-sm">Exam Instructions & Coverage</p>
                </div>
                {showInstructions ? <ChevronUp className="h-4 w-4 text-blue-400" /> : <ChevronDown className="h-4 w-4 text-blue-400" />}
              </button>

              {showInstructions && (
                <div className="px-4 animate-fade-in">
                  <p className="text-xs text-blue-100/70 leading-relaxed mb-4 pl-8 border-l border-blue-500/20">
                    {examMetadata?.theory_instructions || "Please focus on speed and accuracy. Answer all compulsory questions first."}
                  </p>
                  <div className="flex flex-wrap gap-2 pl-8">
                    <span className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-300 uppercase tracking-widest">Part I: Compulsory Cases</span>
                    <span className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-300 uppercase tracking-widest">Part II: Optional Section</span>
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold mb-4 uppercase tracking-widest bg-emerald-500/5 text-emerald-400 border-emerald-500/10">
                {parseInt(question?.question_number) <= (examMetadata?.compulsory_questions || 5) ? "Part I • Compulsory" : "Part II • Optional Section"} • Question {question?.question_number}
              </span>

              {/* DIAGRAM DISPLAY - NOW ABOVE TEXT */}
              {question?.image_url && (
                <div className="mb-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-xl">
                  <div className="relative group">
                    <img 
                      src={question.image_url} 
                      alt={`Diagram for Question ${question.question_number}`}
                      className="w-full h-auto object-contain rounded-2xl max-h-[400px] mx-auto filter brightness-110"
                    />
                  </div>
                </div>
              )}

              <div className="text-xl sm:text-2xl text-white/90 whitespace-pre-wrap leading-relaxed font-medium tracking-wide break-words w-full py-2">
                <LatexRenderer text={question?.question_text || ""} />
              </div>
            </div>
            
            {/* Render sub-questions if they exist */}
            {question?.sub_questions?.length > 0 && (
              <div className="mt-6 flex flex-col gap-4">
                {question.sub_questions.map((sub: any, idx: number) => {
                  return (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="pl-5 border-l-2 border-white/10 text-lg sm:text-xl text-white/80 whitespace-pre-wrap leading-relaxed font-medium break-words w-full py-1">
                        <LatexRenderer text={sub.question_text || sub.text || ""} />
                      </div>
                      
                      {/* Render nested sub-sub-questions if they exist (e.g., Roman numerals i, ii, iii) */}
                      {sub.sub_questions?.length > 0 && (
                        <div className="ml-8 flex flex-col gap-3 mt-2">
                          {sub.sub_questions.map((subsub: any, subIdx: number) => (
                            <div key={subIdx} className="pl-5 border-l-2 border-white/5 text-base sm:text-lg text-white/70 whitespace-pre-wrap leading-relaxed font-medium break-words w-full py-1">
                              <LatexRenderer text={subsub.question_text || subsub.text || ""} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-white/10 p-4">
          <div className="container max-w-3xl flex items-center justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentIdx(currentIdx - 1)}
              disabled={isFirst}
              className="rounded-xl border-white/10 hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft className="mr-1 h-5 w-5" />
              Prev
            </Button>

            {isLast ? (
              <Button
                size="lg"
                onClick={() => handleEndReading()}
                className="rounded-xl px-6 sm:px-8 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold shadow-glow hover:scale-105 transition-transform border-0"
              >
                <UploadCloud className="mr-2 h-5 w-5" /> Start Uploading Scans
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => setCurrentIdx(currentIdx + 1)}
                className="rounded-xl bg-white text-primary hover:bg-white/90 font-bold"
              >
                Next
                <ChevronRight className="ml-1 h-5 w-5" />
              </Button>
            )}
          </div>
        </footer>

        {/* EXIT CONFIRMATION MODAL */}
        {showExitConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated text-center animate-fade-up">
              <h3 className="font-display text-xl font-extrabold text-white mb-2">End Exam Early?</h3>
              <p className="text-sm text-muted-foreground mb-6">Progress will be lost.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowExitConfirm(false)} className="flex-1 rounded-xl">Cancel</Button>
                <Button variant="destructive" onClick={() => navigate("/dashboard")} className="flex-1 rounded-xl">End Exam</Button>
              </div>
            </div>
          </div>
        )}

        {/* START UPLOAD CONFIRMATION MODAL */}
        {showStartUploadConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowStartUploadConfirm(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated text-center animate-fade-up">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 mb-4">
                <UploadCloud className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-extrabold text-white mb-2">Start Scanning?</h3>
              <p className="text-sm text-muted-foreground mb-6">Are you sure you want to close the question paper and start uploading your workings?</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowStartUploadConfirm(false)} className="flex-1 rounded-xl border-white/10">Cancel</Button>
                <Button onClick={() => { setShowStartUploadConfirm(false); setMode('uploading'); }} className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 shadow-glow">Continue</Button>
              </div>
            </div>
          </div>
        )}

        {/* QUESTION NAVIGATOR MODAL */}
        {showNavigator && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm" onClick={() => setShowNavigator(false)} />
            <div className="relative w-full max-w-sm bg-card border border-white/10 rounded-3xl p-6 shadow-elevated animate-fade-up">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-display text-xl font-extrabold text-white">Theory Navigator</h3>
                <button 
                  onClick={() => setShowNavigator(false)} 
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-white/10 text-muted-foreground hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-hide">
                {questions.map((q, i) => {
                  const isCurrent = currentIdx === i;
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIdx(i);
                        setShowNavigator(false);
                      }}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                        isCurrent 
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background bg-white/10 text-white' 
                          : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // BULK UPLOAD MODE
  // ----------------------------------------------------
  const totalUploaded = uploadQueue.filter(i => i.progress === 100).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-24 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-white/10">
        <div className="container max-w-2xl flex h-16 items-center justify-between px-4">
          <div className="font-display text-sm font-extrabold text-white uppercase tracking-tight">Bulk Scanner</div>
          <div className="text-xs font-bold text-muted-foreground bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="text-emerald-400">{totalUploaded}</span> / {uploadQueue.length} Synced
          </div>
        </div>
      </header>

      <main className="flex-1 container max-w-2xl px-4 py-8 flex flex-col animate-fade-in">
        <div className="text-center mb-8">
          <h2 className="font-display text-2xl font-extrabold text-white mb-2 italic">Capture All Workings</h2>
          <p className="text-xs text-muted-foreground leading-relaxed px-6">
            Snap your pages in any order. <span className="text-primary font-bold">Write the question number clearly</span> on top of each page so our AI can sort them.
          </p>
        </div>

        {/* UPLOAD GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {/* CAMERA TRIGGER */}
          <button 
            onClick={handleCaptureImage}
            className="aspect-[3/4] flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-all group"
          >
            <div className="h-12 w-12 bg-primary/20 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase text-primary tracking-widest">Snap Page</p>
          </button>

          {/* QUEUE ITEMS */}
          {uploadQueue.map((item, i) => (
            <div key={item.id} className="relative aspect-[3/4] rounded-3xl overflow-hidden border border-white/10 bg-white/5 animate-fade-up">
              {item.url ? (
                <>
                  <img src={item.url} className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background shadow-glow">
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-pulse" />
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Uploading...</p>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/80 to-transparent flex items-center px-3">
                <span className="text-[10px] font-bold text-white/50">Page {i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-white/10 p-6">
        <div className="container max-w-2xl flex items-center justify-between gap-4">
          <div className="flex-1">
             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Queue Status</p>
             <p className="text-xs font-bold text-white">{uploadQueue.length} pages captured</p>
          </div>
          
          <Button
            size="lg"
            onClick={handleFinishAll}
            disabled={uploadQueue.length === 0 || !uploadQueue.every(i => i.progress === 100)}
            className="rounded-2xl px-10 bg-gradient-hero text-white font-extrabold shadow-glow hover:scale-105 transition-transform disabled:opacity-50"
          >
            Submit All Papers
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default TheoryExam;
