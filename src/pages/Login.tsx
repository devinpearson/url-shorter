import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Link2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { startLogin } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next");
  const returnTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (user) return <Navigate to={returnTo} replace />;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <div className="mb-12">
        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
          <Link2 className="w-5 h-5 text-primary-foreground" aria-hidden="true" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold text-gray-900">Log in to Club Links</h1>
          <p className="text-sm text-gray-600">Create short links for your club and see how often they're clicked.</p>
        </div>

        <Button
          onClick={() => startLogin(returnTo)}
          className="w-full h-12 font-medium"
          disabled={user === undefined}
        >
          Continue
        </Button>
        <p className="text-center text-xs text-gray-500">
          By continuing you agree to the{" "}
          <Link to="/terms" className="underline hover:text-gray-700">
            Terms of Use
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
