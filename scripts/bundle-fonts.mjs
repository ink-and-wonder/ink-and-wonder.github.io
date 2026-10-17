import fs from "node:fs/promises";
const root = new URL("../dist/assets/fonts/", import.meta.url);
await fs.mkdir(root, { recursive: true });
const url =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@400;500;600;700&display=swap";
const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
if (!response.ok) throw Error("Font stylesheet unavailable");
let css = await response.text();
const links = [
  ...new Set(
    [...css.matchAll(/https:\/\/fonts\.gstatic\.com\/[^)]+/g)].map((m) => m[0]),
  ),
];
for (const [index, link] of links.entries()) {
  const extension = link.split(".").at(-1).split("?")[0],
    filename = `font-${index}.${extension}`,
    r = await fetch(link);
  if (!r.ok) throw Error("Font unavailable");
  await fs.writeFile(
    new URL(filename, root),
    Buffer.from(await r.arrayBuffer()),
  );
  css = css.replaceAll(link, filename);
}
await fs.writeFile(new URL("fonts.css", root), css);
for (const family of ["cormorantgaramond", "dmsans"]) {
  const r = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${family}/OFL.txt`,
  );
  if (!r.ok) throw Error("Font license unavailable");
  await fs.writeFile(new URL(`${family}-OFL.txt`, root), await r.text());
}
console.log(`Bundled ${links.length} font files and their licenses.`);
