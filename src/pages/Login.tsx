import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

export default function Login() {
  const handleAuth0Login = () => {
    window.location.href = "/api/auth/login";
  };
  return (
    <>
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-background">
        <h1 className="text-3xl font-bold font-sans text-primary">Sign in to URL Shortener</h1>
        <Button onClick={handleAuth0Login} className="w-64" variant="default" size="lg">
          Sign in with Auth0
        </Button>
      </div>
    </>
  );
}
