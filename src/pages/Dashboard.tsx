import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  Clock,
  GraduationCap,
  Percent,
  TrendingUp,
  UserCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const studentName = "Kwame";

const stats = [
  { label: "Mocks Taken", value: "7", icon: ClipboardList },
  { label: "Average Score", value: "72%", icon: Percent },
  { label: "Days to WASSCE", value: "84", icon: CalendarClock },
];

const results = [
  { title: "Core Math Mock 3", date: "2 days ago", score: 78 },
  { title: "Core Math Mock 2", date: "1 week ago", score: 65 },
  { title: "Core Math Mock 1", date: "2 weeks ago", score: 54 },
];

const scoreColor = (s: number) =>
  s >= 75 ? "text-success" : s >= 60 ? "text-primary" : "text-muted-foreground";

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-extrabold tracking-tight">
              Ace<span className="text-primary">Wassce</span>
            </span>
          </Link>
          <button
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-primary transition hover:bg-secondary"
          >
            <UserCircle2 className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="container px-4 py-8 sm:py-12">
        {/* Welcome */}
        <section className="animate-fade-up">
          <p className="text-sm font-medium text-muted-foreground">Welcome back,</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {studentName} 👋
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One mock today keeps the F9 away. Let&apos;s get to work.
          </p>
        </section>

        {/* Stats */}
        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-soft"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{value}</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </span>
            </div>
          ))}
        </section>

        {/* Main action */}
        <section className="mt-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-hero p-7 text-primary-foreground shadow-elevated sm:p-10">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                Featured Mock
              </span>
              <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
                Core Mathematics — Objective Test
              </h2>
              <p className="mt-2 max-w-lg text-sm text-primary-foreground/85">
                Full-length WAEC-style paper. Auto-graded the moment you submit.
              </p>

              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-primary-foreground/90">
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4" /> 1 hour 30 mins
                </span>
                <span className="inline-flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> 50 questions
                </span>
                <span className="inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Instant grading
                </span>
              </div>

              <Button
                size="lg"
                variant="secondary"
                className="mt-7 h-12 rounded-full px-7 font-bold text-primary shadow-soft hover:bg-white"
              >
                Start Exam
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Recent results */}
        <section className="mt-10">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="text-lg font-bold tracking-tight">Recent Results</h2>
            <button className="text-sm font-semibold text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
            {results.map((r, i) => (
              <div
                key={r.title}
                className={`flex items-center justify-between gap-3 p-4 sm:p-5 ${
                  i !== results.length - 1 ? "border-b border-border/60" : ""
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                    {r.title}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-extrabold ${scoreColor(r.score)}`}>
                    {r.score}%
                  </span>
                  <button className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:inline-flex">
                    Review Mistakes <ChevronRight className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground sm:hidden" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
