import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-white border-b mb-8">
      <Link to="/" className="text-xl font-bold text-blue-600">URL Shortener</Link>
      <div className="flex gap-4">
        <Link to="/">Dashboard</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
}
