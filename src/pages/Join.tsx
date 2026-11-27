import axios from "axios";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  acceptInvite,
  apiErrorMessage,
  fetchInvite,
  type InviteInfo,
  startLogin,
} from "../lib/api";
import { useAuth } from "../lib/auth";

/** toast.li/join/<token>: an invite to become one of a club's officers. */
export default function Join() {
  const { user } = useAuth();
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetchInvite(token)
      .then(setInvite)
      .catch((err) =>
        setProblem(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "That invite link isn't right. Check it was copied in full, or ask for a new one."
            : "Couldn't check this invite. Please try again.",
        ),
      );
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const club = await acceptInvite(token);
      navigate(`/clubs/${club.slug}`, { replace: true });
    } catch (err) {
      setProblem(apiErrorMessage(err));
      setJoining(false);
    }
  };

  const unusable =
    invite?.status === "used"
      ? "This invite link has already been used. Ask the club's officers for a new one."
      : invite?.status === "expired"
        ? "This invite link has expired. Ask the club's officers for a new one."
        : null;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <Card className="p-6 text-center">
        <span className="bg-accent text-primary mx-auto flex size-12 items-center justify-center rounded-full">
          <Users className="size-6" aria-hidden="true" />
        </span>
        {!invite && !problem && <p className="text-muted-foreground mt-4">Checking the invite…</p>}
        {invite && (
          <>
            <h1 className="mt-4 text-xl font-semibold text-gray-900">Join {invite.clubName}</h1>
            <p className="mt-2 text-sm text-gray-600">
              {invite.invitedBy ? `${invite.invitedBy} invited you` : "You've been invited"} to look
              after the club&apos;s short links: change where they go, add new ones and see their
              clicks.
            </p>
          </>
        )}
        {(problem || unusable) && (
          <p role="alert" className="text-destructive mt-4 text-sm">
            {problem ?? unusable}
          </p>
        )}
        {invite && !unusable && !problem && (
          <div className="mt-6">
            {user ? (
              <Button className="w-full" onClick={handleJoin} disabled={joining}>
                {joining ? "Joining…" : `Join as ${user.displayName}`}
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => startLogin(`/join/${token}`)}
                disabled={user === undefined}
              >
                Log in to join
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
