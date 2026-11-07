import type { ReactNode } from "react";

/** Layout for legal pages: a title, the date they last changed and their sections. */
export function LegalPage({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-sm text-gray-500">Last updated {updated}</p>
      <div className="mt-4 leading-relaxed text-gray-700">{intro}</div>
      <div className="mt-8 space-y-8">{children}</div>
    </div>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-20">
      <h2 id={id ? `${id}-heading` : undefined} className="text-xl font-semibold text-gray-900">
        {title}
      </h2>
      <div className="mt-2 space-y-3 leading-relaxed text-gray-700 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
