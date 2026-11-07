import { Link2 } from "lucide-react";
import { Button } from "../components/ui/button";

// Empty by default: the API is served from the same origin (Vite proxies /api in dev).
const API_BASE = import.meta.env.VITE_API_URL ?? "";

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/api/auth/login`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-12">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <Link2 className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to URL Shortener</h1>
          <p className="text-sm text-gray-600">Create short links and track how often they're clicked.</p>
        </div>

        <Button onClick={handleLogin} className="w-full h-12 font-medium">
          Continue
        </Button>
      </div>
    </div>
  );
}
