import { useState, useEffect } from "react";
import { 
  Clock, 
  Calendar, 
  ChevronRight, 
  Search, 
  Filter, 
  CheckCircle2, 
  Brain,
  History as HistoryIcon,
  BookOpen,
  Loader2
} from "lucide-react";
import Skeleton from "@/components/Skeleton";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

const History = () => {
  const [filter, setFilter] = useState("all");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("exam_attempts")
        .select(`
          id,
          status,
          start_time,
          total_score,
          exams (
            title,
            subject
          )
        `)
        .eq("student_id", user.id)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setAttempts(data || []);
    } catch (error: any) {
      console.error("Error fetching history:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const getGrade = (score: number) => {
    if (score >= 80) return "A1";
    if (score >= 70) return "B2";
    if (score >= 60) return "B3";
    if (score >= 50) return "C4";
    return "F9";
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[20%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="absolute bottom-[0%] -right-[10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[110px]" />
      </div>

      <main className="relative z-10 container px-5 py-8 max-w-3xl mx-auto">
        <section className="mb-8 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-bold text-primary uppercase tracking-widest">
              My Records
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
             <HistoryIcon className="h-8 w-8 text-primary" /> Exam History
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your past performances and trace your progress.
          </p>
        </section>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-6 rounded-[2rem] border border-white/5 bg-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <Skeleton variant="rectangle" className="h-12 w-12 !rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <Skeleton variant="text" className="h-5 w-1/2" />
                    <Skeleton variant="text" className="h-3 w-1/3" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-4">
                  <Skeleton variant="rectangle" className="h-10 w-16 !rounded-xl" />
                  <Skeleton variant="rectangle" className="h-12 w-12 !rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : attempts.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-[2.5rem] border border-white/5">
            <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10">
              <HistoryIcon className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">No records yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">Once you complete a mock exam, your results will appear here.</p>
            <Button className="mt-6 rounded-full px-8" onClick={() => (window.location.href = "/practice")}>
              Take First Mock
            </Button>
          </div>
        ) : (
          <section className="space-y-4">
            {attempts.map((attempt, idx) => (
              <div 
                key={attempt.id} 
                className="glass-card-hover group relative overflow-hidden rounded-[2rem] p-6 border border-white/5 shadow-soft animate-fade-up"
                style={{ animationDelay: `${(idx + 1) * 100}ms` }}
              >
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ${attempt.status === 'in_progress' ? 'text-amber-400 animate-pulse' : 'text-primary'}`}>
                      {attempt.status === 'in_progress' ? <Clock className="h-6 w-6" /> : <BookOpen className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                        {attempt.exams?.title || "WASSCE Mock"}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(attempt.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="h-1 w-1 rounded-full bg-white/20" />
                        <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter">
                          {attempt.exams?.subject || "Core Maths"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 bg-white/5 sm:bg-transparent rounded-2xl p-4 sm:p-0">
                    {attempt.status === 'in_progress' ? (
                      <div className="text-right">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">In Progress</p>
                        <p className="text-sm font-bold text-muted-foreground italic">Resume Practice</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-center sm:text-right">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Score</p>
                          <p className="text-xl font-display font-black text-foreground">
                            {attempt.total_score || 0}<span className="text-xs text-muted-foreground font-bold italic ml-0.5">/100</span>
                          </p>
                        </div>
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-hero flex flex-col items-center justify-center text-white shadow-glow group-hover:scale-110 transition-transform">
                          <p className="text-[8px] font-black opacity-60 leading-none mb-0.5 uppercase">Grade</p>
                          <p className="text-lg font-black leading-none">{getGrade(attempt.total_score || 0)}</p>
                        </div>
                      </>
                    )}
                    <ChevronRight className="hidden sm:block h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}

            <div className="mt-12 text-center flex flex-col items-center gap-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                AceWassce v1.0.0
              </p>
              <p className="text-[9px] text-primary/60 font-semibold uppercase tracking-wider">
                A product from Sixzones Technologies
              </p>
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default History;
