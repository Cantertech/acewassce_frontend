import { Link, NavLink } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-extrabold tracking-tight">
            Ace<span className="text-primary">Wassce</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <NavLink to="/login">
            <Button variant="ghost" size="sm" className="font-semibold">
              Log In
            </Button>
          </NavLink>
          <NavLink to="/signup">
            <Button size="sm" className="font-semibold shadow-soft">
              Sign Up
            </Button>
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
