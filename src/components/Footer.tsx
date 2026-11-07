import { Link } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Your links" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/terms", label: "Terms of Use" },
  { to: "/contact?topic=report", label: "Report a link" },
];

export default function Footer() {
  return (
    <footer className="border-border bg-muted mt-auto border-t">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
          {LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-gray-600 hover:text-gray-900 hover:underline">
              {label}
            </Link>
          ))}
        </nav>

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs leading-relaxed text-gray-500">
          The names &quot;Toastmasters International&quot;, &quot;Toastmasters&quot; and the
          Toastmasters International emblem are trademarks protected in the United States, Canada
          and other countries where Toastmasters clubs exist.
        </p>
        <p className="mt-3 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} Devin Pearson. An independent, unofficial service for clubs,
          not affiliated with or endorsed by Toastmasters International.
        </p>
      </div>
    </footer>
  );
}
