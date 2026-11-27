import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import "./App.css";

const TITLES: Record<string, string> = {
  "/": "Club Links – short links for Toastmasters clubs",
  "/dashboard": "Your links – Club Links",
  "/clubs": "Your clubs – Club Links",
  "/about": "About – Club Links",
  "/contact": "Contact – Club Links",
  "/terms": "Terms of Use – Club Links",
  "/login": "Log in – Club Links",
};

/** Titles for pages with a second segment; the club page sets its own once it has loaded. */
function nestedTitle(pathname: string) {
  if (pathname.startsWith("/stats/")) return "Manage link – Club Links";
  if (pathname.startsWith("/clubs/")) return "Manage club – Club Links";
  if (pathname.startsWith("/join/")) return "Join a club – Club Links";
  return "Club Links";
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = TITLES[pathname] ?? nestedTitle(pathname);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-left">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
