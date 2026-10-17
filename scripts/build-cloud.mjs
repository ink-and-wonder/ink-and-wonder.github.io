import { build } from "esbuild";
await build({
  stdin: {
    contents: 'export { createClient } from "@supabase/supabase-js";',
    resolveDir: process.cwd(),
    sourcefile: "supabase-browser-entry.js",
  },
  outfile: "dist/vendor/supabase.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "eof",
  define: { "process.env.NODE_ENV": '"production"' },
});
console.log("Bundled official Supabase client locally.");
