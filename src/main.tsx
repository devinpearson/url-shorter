import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import About from "./pages/About";
import Club from "./pages/Club";
import ClubPage from "./pages/ClubPage";
import Clubs from "./pages/Clubs";
import Contact from "./pages/Contact";
import Dashboard from "./pages/Dashboard";
import Join from "./pages/Join";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Stats from "./pages/Stats";
import Terms from "./pages/Terms";

const root = document.getElementById("root");
if (!root) throw new Error("index.html is missing the #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<Landing />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="login" element={<Login />} />
            <Route path="stats/:shortId" element={<Stats />} />
            <Route path="clubs" element={<Clubs />} />
            <Route path="clubs/:slug" element={<Club />} />
            <Route path="join/:token" element={<Join />} />
            <Route path="c/:slug" element={<ClubPage />} />
            <Route path="about" element={<About />} />
            <Route path="contact" element={<Contact />} />
            <Route path="terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>,
);
