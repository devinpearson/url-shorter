import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import "./App.css";

const TITLES: Record<string, string> = {
  "/": "Club Links – short links for Toastmasters clubs",
  "/dashboard": "Your links – Club Links",
  "/about": "About – Club Links",
  "/contact": "Contact – Club Links",
  "/terms": "Terms of Use – Club Links",
  "/login": "Log in – Club Links",
};

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title =
      TITLES[pathname] ??
      (pathname.startsWith("/stats/") ? "Manage link – Club Links" : "Club Links");
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
