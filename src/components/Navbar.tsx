import { Link2, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
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
  const { pathname } = useLocation();
  // The mobile menu stays open only on the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;

  const account = user ? (
    <a
      href={`${API_BASE}/api/auth/logout`}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      Log out
    </a>
  ) : user === null ? (
    <Button variant="outline" size="sm" onClick={() => startLogin()}>
      Log in
    </Button>
  ) : null;

  return (
    <nav className="border-border w-full border-b bg-white" aria-label="Main">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="bg-primary flex size-8 items-center justify-center rounded-full">
            <Link2 className="text-primary-foreground size-4" aria-hidden="true" />
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
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-border border-t px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(navLinkClass({ isActive }), "justify-start")}
              >
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
