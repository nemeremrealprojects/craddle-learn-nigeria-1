import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X, Phone, GraduationCap } from "lucide-react";
import { useAuth, primaryRole } from "@/lib/auth-context";
import { CRF_CONTACT } from "@/lib/brand";

const nav = [
  { to: "/", label: "Home" },
  { to: "/courses", label: "Courses" },
  { to: "/summer", label: "Summer" },
  { to: "/about", label: "About" },
  { to: "/admissions", label: "Admissions" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const { user, roles } = useAuth();
  const dashHref =
    !user ? "/auth"
    : primaryRole(roles) === "admin" ? "/admin"
    : primaryRole(roles) === "teacher" ? "/teacher"
    : primaryRole(roles) === "parent" ? "/parent"
    : "/student";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="hidden sm:flex items-center justify-between bg-navy text-navy-foreground text-xs px-4 py-1.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {CRF_CONTACT.phone1}</span>
          <span className="opacity-75">•</span>
          <span>{CRF_CONTACT.phone2}</span>
        </div>
        <span className="opacity-80">Nigeria's premium online Nursery & Primary academy</span>
      </div>
      <div className="mx-auto max-w-7xl px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-navy">
          <span className="grid place-items-center h-9 w-9 rounded-lg bg-hero text-navy-foreground shadow-elegant">
            <GraduationCap className="h-5 w-5 text-gold" />
          </span>
          <span>CRF Academy</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="px-3 py-2 rounded-md text-sm font-medium text-foreground/80 hover:text-navy hover:bg-accent transition"
              activeProps={{ className: "px-3 py-2 rounded-md text-sm font-semibold text-navy bg-accent" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Link
            to={dashHref}
            className="px-4 py-2 rounded-md text-sm font-semibold bg-gold-gradient text-gold-foreground shadow-gold hover:opacity-95 transition"
          >
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
        <button className="md:hidden p-2" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-accent">
              {n.label}
            </Link>
          ))}
          <Link to={dashHref} onClick={() => setOpen(false)} className="block px-3 py-2 rounded-md text-sm font-semibold bg-navy text-navy-foreground text-center mt-2">
            {user ? "Dashboard" : "Sign in"}
          </Link>
        </div>
      )}
    </header>
  );
}
