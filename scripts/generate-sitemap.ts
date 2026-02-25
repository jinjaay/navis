import { writeFile } from "node:fs/promises";
import path from "node:path";

import { promptLibrary } from "../src/content/prompts";

const siteUrl = process.env.SITE_URL ?? "https://travelerprompt.replit.app";

const url = (pathname: string) =>
  `${siteUrl.replace(/\/$/, "")}${pathname}`;

const routes = [
  "/",
  "/insights",
  ...promptLibrary.map((prompt) => `/prompts/${prompt.slug ?? prompt.id}`),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${url(route)}</loc>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const outputPath = path.resolve("public", "sitemap.xml");

await writeFile(outputPath, xml, "utf-8");
console.log(`Sitemap written to ${outputPath}`);
