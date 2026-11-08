import axios from "axios";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card } from "../components/ui/card";
import { type ClubPageData, fetchClubPage, shortLink, shortLinkLabel } from "../lib/api";

/** toast.li/c/<club>: a public page listing the links a club's officers chose to show. */
export default function ClubPage() {
  const { slug = "" } = useParams();
  const [page, setPage] = useState<ClubPageData | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    fetchClubPage(slug)
      .then((data) => {
        setPage(data);
        document.title = `${data.name} – Club Links`;
      })
      .catch((err) =>
        setProblem(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "We couldn't find that club. Check the spelling against the poster or message you got it from."
            : "Couldn't load this club's page. Please try again.",
        ),
      );
  }, [slug]);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      {problem && (
        <Card className="p-6">
          <h1 className="text-xl font-semibold text-gray-900">Club not found</h1>
          <p role="alert" className="mt-2 text-gray-600">
            {problem}
          </p>
        </Card>
      )}
      {!page && !problem && <p className="text-muted-foreground text-center">Loading…</p>}
      {page && (
        <>
          <h1 className="text-center text-2xl font-bold text-gray-900">{page.name}</h1>
          {page.links.length === 0 ? (
            <p className="mt-4 text-center text-gray-600">
              The club hasn&apos;t added any links here yet.
            </p>
          ) : (
            <ul className="mt-6 space-y-3">
              {page.links.map((link) => (
                <li key={link.shortId}>
                  <a
                    href={shortLink(link.shortId)}
                    className="border-border hover:border-primary flex items-center justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-gray-900">
                        {link.title || shortLinkLabel(link.shortId)}
                      </span>
                      {link.title && (
                        <span className="block truncate text-sm text-gray-600">
                          {shortLinkLabel(link.shortId)}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="text-primary size-5 shrink-0" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-8 text-center text-xs text-gray-500">
            Links listed by the club&apos;s officers. Something wrong?{" "}
            <Link to="/contact?topic=report" className="underline">
              Report it
            </Link>
            .
          </p>
        </>
      )}
    </div>
  );
}
