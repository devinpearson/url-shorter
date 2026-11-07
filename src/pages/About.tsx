import { Link } from "react-router-dom";
import { Linkedin } from "lucide-react";
import { Card } from "../components/ui/card";

export default function About() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">About</h1>
        <p className="mt-2 text-gray-600">Why Club Links exists and who built it</p>
      </div>

      <Card className="p-6 shadow-md md:p-8 lg:p-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <img
              src="/portrait.png"
              alt="Devin Pearson"
              width={320}
              height={320}
              className="mx-auto aspect-square w-full max-w-xs rounded-lg object-cover shadow-md lg:mx-0"
            />
          </div>

          <div className="lg:col-span-2">
            <h2 className="mb-4 text-2xl font-semibold text-gray-900">Why I built Club Links</h2>
            <p className="mb-4 leading-relaxed text-gray-700">
              Every club meeting runs on links: the role sign-up sheet, the online meeting room, the guest form,
              the agenda. They&apos;re usually long, hard to read out at the end of a meeting and easy to mistype
              from a slide or a flyer.
            </p>
            <p className="mb-4 leading-relaxed text-gray-700">
              Club Links turns those into short names your members and guests can remember, like{" "}
              <span className="font-mono text-primary">/club-roles</span> or{" "}
              <span className="font-mono text-primary">/visit-us</span>, and shows how many people opened each one,
              so club officers can see which announcements are working. It&apos;s free for clubs to use.
            </p>
            <p className="mb-6 leading-relaxed text-gray-700">
              Have an idea or found a problem? I&apos;d love to hear it through the{" "}
              <Link to="/contact" className="text-primary underline">
                contact form
              </Link>
              .
            </p>

            <a
              href="https://www.linkedin.com/in/pearsondevin/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left transition-colors hover:border-sky-300 hover:bg-sky-100 sm:w-auto"
              aria-label="Connect with Devin Pearson on LinkedIn"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                  <Linkedin className="h-5 w-5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-sky-950">Let&apos;s connect on LinkedIn</span>
                  <span className="block text-sm text-sky-800">
                    For updates, Toastmasters ideas and collaboration.
                  </span>
                </span>
              </span>
              <span className="text-sm font-semibold text-sky-700">Connect</span>
            </a>

            <div className="mt-6 border-t border-border pt-6 text-sm text-gray-600">
              <p className="mb-2">
                <span className="font-semibold text-gray-900">Toastmaster since:</span> 2019
              </p>
              <p>
                <span className="font-semibold text-gray-900">Current role:</span> District 74 Program Quality
                Director (2026–2027)
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
