import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Link2, Menu, X } from "lucide-react";
import { API_BASE, startLogin } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/utils";
import { Button, buttonVariants } from "./ui/button";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(buttonVariants({ variant: "ghost", size: "sm" }), isActive && "bg-accent text-primary");

export default function Navbar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close the mobile menu after navigating.
  useEffect(() => setOpen(false), [location.pathname]);

  const account = user ? (
    <a href={`${API_BASE}/api/auth/logout`} className={buttonVariants({ variant: "outline", size: "sm" })}>
      Log out
    </a>
  ) : user === null ? (
    <Button variant="outline" size="sm" onClick={() => startLogin()}>
      Log in
    </Button>
  ) : null;

  return (
    <nav className="w-full border-b border-border bg-white" aria-label="Main">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Link2 className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          Club Links
        </Link>

        <div className="hidden items-center gap-1 text-sm sm:flex">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              {label}
            </NavLink>
          ))}
          <span className="ml-2">{account}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-border px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink key={to} to={to} className={({ isActive }) => cn(navLinkClass({ isActive }), "justify-start")}>
                {label}
              </NavLink>
            ))}
            <div className="mt-2">{account}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
