// A direct-file edition for reviewing before GitHub hosting. The normal index
// keeps native modules; this edition bundles the same source without a runtime.
import fs from "node:fs/promises";
const root = new URL("../dist/", import.meta.url),
  files = [
    "vocabulary.js",
    "data.js",
    "engine.js",
    "compiler.js",
    "state.js",
    "cloud-config.js",
    "traffic.js",
    "cloud.js",
    "drawing.js",
    "music.js",
    "world.js",
    "game.js",
  ];
const modules = await Promise.all(
  files.map(async (file) => {
    const text = await fs.readFile(new URL(file, root), "utf8");
    return (
      `/* ${file} */\n` +
      text
        .replace(/import\s+[^;]+?\s+from\s+['"][^'"]+['"];?/g, "")
        .replace(/\bexport\s+(?=(?:async\s+)?(?:const|let|function|class)\b)/g, "")
    );
  }),
);
let html = await fs.readFile(new URL("index.html", root), "utf8");
html = html
  .replace(
    /<script type="module" src="game\.js(?:\?v=[\d.]+)?"><\/script>/,
    () => `<script>\n(()=>{\n${modules.join("\n")}\n})();\n</script>`,
  )
  .replace(
    'class="corner-mark" href="./"',
    'class="corner-mark" href="play.html"',
  );
await fs.writeFile(new URL("play.html", root), html);
console.log("Direct-file edition: dist/play.html");
