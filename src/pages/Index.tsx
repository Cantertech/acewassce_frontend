import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Sparkles, Target, Trophy } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-soft">
      <Navbar />

      {/* Hero */}
      <main className="container px-4 pt-12 pb-20 sm:pt-20 sm:pb-28">
        <section className="mx-auto max-w-3xl text-center animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Free for every Ghanaian student
          </span>
          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Ace Your WASSCE.{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              Take a Free Mock Exam Today.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Instant grading, real exam timing, and performance tracking to help you score an A1.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <Link to="/signup">
              <Button
                size="lg"
                className="h-14 animate-pulse-glow rounded-full px-8 text-base font-bold shadow-elevated"
              >
                Start Free Core Math Mock
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="text-xs text-muted-foreground">No credit card. 90 minutes. 50 questions.</p>
          </div>
        </section>

        {/* Feature row */}
        <section className="mx-auto mt-20 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, title: "Real Exam Timing", desc: "1h 30m timer mirrors the real WAEC paper." },
            { icon: Target, title: "Instant Grading", desc: "See your score and breakdown the moment you finish." },
            { icon: Trophy, title: "Track Progress", desc: "Watch your average climb toward that A1." },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-border/70 bg-card p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-elevated"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-bold text-foreground">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </section>

        {/* Trust */}
        <section className="mx-auto mt-16 max-w-3xl">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Built for Ghanaian Students
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> 100% Syllabus Aligned
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Trusted by 10,000+ learners
            </span>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AceWassce. Made with care for WAEC candidates.
        </div>
      </footer>
    </div>
  );
};

export default Index;
