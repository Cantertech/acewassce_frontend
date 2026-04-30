import { Link, useLocation } from "react-router-dom";
import { Home, BookOpen, History, User } from "lucide-react";

const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: BookOpen, label: "Practice", path: "/practice" },
    { icon: History, label: "History", path: "/history" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 sm:px-6 pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto">
        <nav className="glass-card flex h-16 w-full items-center justify-around rounded-[1.5rem] bg-card/80 px-2 shadow-elevated border border-white/10 backdrop-blur-2xl">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = currentPath === path;
            return (
              <Link
                key={label}
                to={path}
                className={`flex w-16 flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div
                  className={`relative flex h-8 w-8 items-center justify-center rounded-xl transition-all ${
                    active ? "bg-primary/15" : ""
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`} />
                  {active && (
                    <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary" />
                  )}
                </div>
                <span className={`text-[10px] font-semibold ${active ? "text-primary font-bold" : ""}`}>
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default BottomNav;
