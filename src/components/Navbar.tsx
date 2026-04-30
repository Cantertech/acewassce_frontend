import { Link, NavLink } from "react-router-dom";
import logo from "@/assets/ace_logo.png";
import { Button } from "@/components/ui/button";

const Navbar = () => (
  <header className="sticky top-0 z-50 w-full border-b border-white/8 bg-background/70 backdrop-blur-xl">
    <div className="container flex h-16 items-center justify-between px-5">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-soft overflow-hidden group-hover:scale-105 transition-transform">
          <img src={logo} alt="AceWassce" className="h-full w-full object-cover" />
        </span>
        <span className="font-display text-base font-extrabold tracking-tight text-foreground">
          Ace<span className="gradient-text">Wassce</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-2">
        <NavLink to="/login">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full font-semibold text-muted-foreground hover:text-foreground hover:bg-white/8 transition-all"
          >
            Log In
          </Button>
        </NavLink>
        <NavLink to="/signup">
          <Button
            size="sm"
            className="rounded-full bg-gradient-hero border-0 font-semibold text-white shadow-soft hover:opacity-90 transition-all"
          >
            Sign Up Free
          </Button>
        </NavLink>
      </nav>
    </div>
  </header>
);

export default Navbar;
