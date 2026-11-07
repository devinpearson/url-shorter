import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { API_BASE, startLogin } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Button, buttonVariants } from "./ui/button";

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="w-full border-b border-border bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Link2 className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
          </span>
          Club Links
        </Link>
        <div className="flex items-center gap-2 text-sm">
          {user ? (
            <>
              <Link to="/dashboard" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Your links
              </Link>
              <a
                href={`${API_BASE}/api/auth/logout`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Log out
              </a>
            </>
          ) : user === null ? (
            <Button variant="outline" size="sm" onClick={() => startLogin()}>
              Log in
            </Button>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
