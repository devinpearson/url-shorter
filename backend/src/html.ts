/** Escapes text for safe use inside HTML, including attribute values. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c] ?? c,
  );
}

/** A small standalone page (no app JavaScript), for the not-found and preview pages. */
export function simplePage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} – Club Links</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid;
         place-items: center; background: #fff; color: #1f2937; padding: 1.5rem; }
  main { max-width: 34rem; text-align: center; }
  h1 { font-size: 1.75rem; margin-bottom: 0.5rem; }
  p { color: #4b5563; line-height: 1.6; }
  a { color: #4f46e5; font-weight: 600; }
  .destination { word-break: break-all; background: #f3f4f6; border-radius: 0.5rem;
                 padding: 0.75rem 1rem; color: #111827; font-weight: 500; }
  .button { display: inline-block; margin-top: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 0.5rem;
            background: #4f46e5; color: #fff; text-decoration: none; }
  .small { font-size: 0.875rem; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`;
}
