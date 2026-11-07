import { Link2 } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { startLogin } from "../lib/api";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const next = params.get("next");
  const returnTo = next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (user) return <Navigate to={returnTo} replace />;

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20">
      <div className="mb-12">
        <div className="bg-primary flex size-10 items-center justify-center rounded-full">
          <Link2 className="text-primary-foreground size-5" aria-hidden="true" />
        </div>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Log in to Club Links</h1>
          <p className="text-sm text-gray-600">
            Create short links for your club and see how often they're clicked.
          </p>
        </div>

        <Button
          onClick={() => startLogin(returnTo)}
          className="h-12 w-full font-medium"
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
