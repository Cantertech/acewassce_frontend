import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Clock,
  TrendingUp,
  Award,
  Target,
  Home,
  BarChart3,
  History,
  User,
  Sparkles,
  Brain,
  Loader2,
  Coins
} from "lucide-react";
import Skeleton from "@/components/Skeleton";
import logo from "@/assets/ace_logo.png";
import WalletModal from "@/components/WalletModal";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/lib/supabase";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState("Student");
  const [chartData, setChartData] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);
  const [percentile, setPercentile] = useState(0);
  const [dailyGoalProgress, setDailyGoalProgress] = useState(0);
  const [userRank, setUserRank] = useState(0);
  const [walletPoints, setWalletPoints] = useState<number | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [stats, setStats] = useState([
    { label: "Mocks Taken", value: "0", icon: ClipboardList, color: "text-blue-400" },
    { label: "Average Grade", value: "-", icon: Award, color: "text-amber-400" },
    { label: "Level & Rank", value: "L1 • #0", icon: TrendingUp, color: "text-emerald-400" },
  ]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      // 1. Get Student Profile
      const { data: profile } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setStudentName(profile.full_name?.split(" ")[0] || "Student");
        setWalletPoints(profile.wallet_points !== undefined && profile.wallet_points !== null ? profile.wallet_points : 10);
        
        // Calculate Rank
        const { count: rankCount } = await supabase
          .from("students")
          .select("*", { count: "exact", head: true })
          .gt("total_points", profile.total_points || 0);
          
        const currentRank = (rankCount || 0) + 1;
        const currentLevel = Math.floor((profile.total_points || 0) / 100) + 1;

        // Update stats but keep 'Days Left' hardcoded or find a way to calculate it
        setStats([
          { label: "Mocks Taken", value: "0", icon: ClipboardList, color: "text-blue-400" },
          { label: "Average Grade", value: "-", icon: Award, color: "text-amber-400" },
          { label: "Level & Rank", value: `L${currentLevel} • #${currentRank}`, icon: TrendingUp, color: "text-emerald-400" },
        ]);
        
        // Preserve other data for next steps
        (window as any)._userRank = currentRank;
      }

      // 2. Get Exam Stats & Graph Data
      const { data: attempts } = await supabase
        .from("exam_attempts")
        .select("total_score, status, start_time")
        .eq("student_id", user.id)
        .order("start_time", { ascending: true });

      if (attempts) {
        const completed = attempts.filter(a => a.status === 'graded');
        const avgScore = completed.length > 0 
          ? Math.round(completed.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / completed.length)
          : 0;

        const getGrade = (s: number) => {
           if (s >= 80) return "A1";
           if (s >= 70) return "B2";
           if (s >= 60) return "B3";
           if (s >= 50) return "C4";
           return "F9";
        };

        // Format for Chart (Last 6 mocks)
        const recentAttempts = completed.slice(-6).map((a, i) => ({
          name: `Mock ${i + 1}`,
          score: a.total_score || 0
        }));
        setChartData(recentAttempts.length > 0 ? recentAttempts : [
          { name: "Start", score: 0 }
        ]);

        // Last Result for Hero Card
        if (completed.length > 0) {
          setLastResult(completed[completed.length - 1]);
        }

        const { data: profile_new } = await supabase.from("students").select("*").eq("id", user.id).maybeSingle();
        
        // Ranking Calculation
        const { count: rankCount } = await supabase.from("students").select("*", { count: "exact", head: true }).gt("total_points", profile_new?.total_points || 0);
        const { count: totalStudents } = await supabase.from("students").select("*", { count: "exact", head: true });
        
        const currentRank = (rankCount || 0) + 1;
        const currentLevel = Math.floor((profile_new?.total_points || 0) / 100) + 1;
        const calculatedPercentile = totalStudents && totalStudents > 0 ? Math.max(1, Math.round((currentRank / totalStudents) * 100)) : 100;
        
        setPercentile(calculatedPercentile);
        setUserRank(currentRank);

        // Daily Goal Logic (Goal: 2 Mocks per day)
        const today = new Date();
        today.setHours(0,0,0,0);
        const todayMocks = attempts.filter(a => new Date(a.start_time) >= today).length;
        const goalProgress = Math.min(100, Math.round((todayMocks / 2) * 100));
        setDailyGoalProgress(goalProgress);

        setStats([
          { label: "Mocks Taken", value: attempts.length.toString(), icon: ClipboardList, color: "text-blue-400" },
          { label: "Average Grade", value: completed.length > 0 ? getGrade(avgScore) : "-", icon: Award, color: "text-amber-400" },
          { label: "Level & Rank", value: `L${currentLevel} • #${currentRank}`, icon: TrendingUp, color: "text-emerald-400" },
        ]);
      }

      // 3. Get Weaknesses from View
      const { data: topicPerformance } = await supabase
        .from("student_topic_performance")
        .select("*")
        .eq("student_id", user.id)
        .order("proficiency_index", { ascending: true })
        .limit(3);

      if (topicPerformance) {
        const colors = ["bg-rose-500", "bg-amber-500", "bg-blue-500"];
        setWeaknesses(topicPerformance.map((tp, i) => ({
          topic: tp.topic,
          progress: Math.round(tp.proficiency_index),
          color: colors[i % colors.length]
        })));
      } else {
        // Fallback placeholders if no data yet
        setWeaknesses([
          { topic: "Calculus", progress: 0, color: "bg-rose-500" },
          { topic: "Circle Theorems", progress: 0, color: "bg-amber-500" }
        ]);
      }
    } catch (error: any) {
      console.error("Dashboard error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-10 animate-pulse">
        <div className="flex items-center justify-between">
          <Skeleton variant="rectangle" className="h-10 w-40" />
          <Skeleton variant="circle" className="h-10 w-10" />
        </div>
        <div className="space-y-4">
          <Skeleton variant="text" className="h-10 w-1/2" />
          <Skeleton variant="text" className="h-4 w-3/4" />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Skeleton variant="rectangle" className="h-[300px] w-full rounded-[2.5rem]" />
            <Skeleton variant="rectangle" className="h-[300px] w-full rounded-[2.5rem]" />
          </div>
          <div className="space-y-6">
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
            <Skeleton variant="rectangle" className="h-24 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden pb-24 selection:bg-primary/30 selection:text-white">
      {/* ── AMBIENT BACKGROUND ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] h-[700px] w-[700px] rounded-full bg-primary/10 blur-[130px] animate-pulse-slow" />
        <div className="absolute top-[30%] -right-[15%] h-[600px] w-[600px] rounded-full bg-purple-600/10 blur-[110px]" />
        <div className="absolute bottom-[-10%] left-[20%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      {/* ── 1. TOP NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="container flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-soft overflow-hidden group-hover:scale-105 transition-transform">
              <img src={logo} alt="A1 Preps" className="h-full w-full object-cover" />
            </span>
            <div className="flex flex-col">
              <span className="font-display text-base font-extrabold tracking-tight text-foreground">
                A1 <span className="gradient-text">Preps</span>
              </span>
              <span className="text-[8px] font-black tracking-widest uppercase text-muted-foreground/70 -mt-0.5">
                Powered by Sixzones
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowWalletModal(true)}
              className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all shadow-glow"
            >
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{walletPoints !== null ? `${walletPoints} Pts` : "10 Pts"}</span>
            </button>
            <button className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              <span>Rank: #{userRank || 0}</span>
            </button>
            <button
              aria-label="Profile"
              onClick={() => navigate("/profile")}
              className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-all overflow-hidden"
            >
              <User className="h-5 w-5 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 container px-5 sm:px-8 max-w-6xl mx-auto mt-8">
        {/* ── 2. HEADER SECTION ── */}
        <section className="mb-6 animate-fade-up">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-[10px] font-black text-primary uppercase tracking-widest">
              Dashboard
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Akwaaba, <span className="gradient-text">{studentName}!</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {percentile <= 25 ? (
              <>You're in the <span className="text-emerald-400 font-bold">top {percentile}%</span> — incredible work!</>
            ) : (
              <>Keep grinding — every mock gets you closer to <span className="text-primary font-bold">A1</span>.</>
            )}
          </p>
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* ── 3. HERO ACTION CARD ── */}
            <section className="relative group animate-fade-up" style={{ animationDelay: "100ms" }}>
              <div className="absolute inset-0 bg-gradient-hero blur-3xl opacity-15 group-hover:opacity-25 transition-opacity" />
              <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-6 sm:p-8 shadow-glow border border-white/10">
                <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-[70px] animate-float" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
                  <div className="flex-1">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/25 px-3 py-1 text-[10px] font-black text-white uppercase tracking-widest backdrop-blur-md mb-4">
                      <Clock className="h-3 w-3" /> Ready to Practice
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white leading-tight tracking-tight mb-2">
                      Core Maths <span className="text-white/70">Mock</span>
                    </h2>
                    <p className="text-white/60 text-xs font-medium max-w-xs leading-relaxed mb-5">
                      50 MCQs + 13 Theory questions with instant AI forensic grading.
                    </p>
                    <Button
                      size="lg"
                      onClick={() => navigate("/practice")}
                      className="h-12 rounded-full bg-white text-primary hover:bg-white/90 font-black text-sm shadow-elevated transition-all hover:scale-105 active:scale-95 border-0 px-7"
                    >
                      Start Mock Exam
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>

                  {/* Last result mini card */}
                  {lastResult && (
                    <div className="hidden sm:block w-44 shrink-0">
                      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-soft">
                        <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Last Score</p>
                        <div className="flex items-end gap-1 mb-3">
                          <span className="text-4xl font-black text-white leading-none">{lastResult.total_score || 0}</span>
                          <span className="text-lg text-white/40 font-bold mb-0.5">%</span>
                        </div>
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-white rounded-full" style={{ width: `${lastResult.total_score || 0}%` }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ── 4. PERFORMANCE GRAPH ── */}
            <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
              <div className="rounded-3xl bg-white/[0.03] border border-white/5 p-5 sm:p-6 shadow-elevated">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-display font-extrabold tracking-tight flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" /> Score Trend
                    </h2>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">Last {chartData.length} mock{chartData.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(214 100% 60%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(214 100% 60%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={15}
                        fontFamily="Outfit"
                        fontWeight="bold"
                      />
                      <YAxis 
                        stroke="rgba(255,255,255,0.2)" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(value) => `${value}%`}
                        fontFamily="Outfit"
                        fontWeight="bold"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 15, 30, 0.9)', 
                          borderColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '20px',
                          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                          backdropFilter: 'blur(10px)',
                          padding: '12px 16px',
                          border: '1px solid rgba(255,255,255,0.05)'
                        }} 
                        itemStyle={{ color: 'hsl(214 100% 60%)', fontWeight: '900', fontSize: '16px' }}
                        labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}
                        cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="score" 
                        stroke="hsl(214 100% 60%)" 
                        strokeWidth={5} 
                        dot={{ fill: 'hsl(218 55% 9%)', stroke: 'hsl(214 100% 60%)', strokeWidth: 3, r: 6 }} 
                        activeDot={{ r: 9, fill: 'white', stroke: 'hsl(214 100% 60%)', strokeWidth: 4 }}
                        animationDuration={2000}
                        animationEasing="ease-in-out"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            {/* ── 5. STATS GRID ── */}
            <div className="space-y-3">
              {stats.map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="group flex items-center gap-4 rounded-2xl bg-white/[0.03] border border-white/5 p-4 hover:bg-white/[0.06] transition-all"
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10 ${color} shrink-0 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                    <p className="font-display text-xl font-black text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── 6. DAILY GOAL ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Daily Goal</span>
                <span className="text-xs font-black text-primary">{dailyGoalProgress}%</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${dailyGoalProgress}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Complete 2 mocks today</p>
            </div>

            {/* ── 7. TOPIC WEAKNESSES ── */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
              <h3 className="text-xs font-display font-extrabold tracking-tight mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-400" /> Weak Areas
              </h3>
              <div className="space-y-3">
                {weaknesses.map((item) => (
                  <div key={item.topic}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-bold text-foreground">{item.topic}</p>
                      <p className="text-[10px] font-black text-muted-foreground">{item.progress}%</p>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-1000`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 8. QUICK CTA ── */}
            <button
              onClick={() => navigate("/practice")}
              className="w-full rounded-2xl bg-primary/10 border border-primary/20 p-5 text-center hover:bg-primary/15 active:scale-[0.98] transition-all group"
            >
              <h4 className="font-display text-base font-black text-primary mb-1 group-hover:scale-105 transition-transform">Ready for A1?</h4>
              <p className="text-[10px] text-primary/60 font-medium">Start a timed exam simulation</p>
            </button>

            <p className="text-center text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.2em] pt-2">
              Product of Sixzones Tech
            </p>
          </aside>
        </div>
      </main>

      {/* ── 8. BOTTOM NAV ── */}
      <BottomNav />

      <WalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)}
        onSuccess={fetchDashboardData}
      />
    </div>
  );
};

export default Dashboard;
