import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const extDir = path.join(rootDir, "extension");
const outDir = path.join(rootDir, "dist", "extension");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await Promise.all([
  build({
    entryPoints: [path.join(extDir, "content.js")],
    outfile: path.join(outDir, "content.js"),
    bundle: true,
    format: "iife",
    target: ["chrome120"],
  }),
  build({
    entryPoints: [path.join(extDir, "background.js")],
    outfile: path.join(outDir, "background.js"),
    bundle: true,
    format: "esm",
    target: ["chrome120"],
  }),
  build({
    entryPoints: [path.join(extDir, "popup.js")],
    outfile: path.join(outDir, "popup.js"),
    bundle: true,
    format: "iife",
    target: ["chrome120"],
  }),
  build({
    entryPoints: [path.join(extDir, "options.js")],
    outfile: path.join(outDir, "options.js"),
    bundle: true,
    format: "iife",
    target: ["chrome120"],
  }),
]);

const staticFiles = [
  "manifest.json",
  "content.css",
  "popup.html",
  "popup.css",
  "options.html",
  "options.css",
];

for (const file of staticFiles) {
  cpSync(path.join(extDir, file), path.join(outDir, file));
}

cpSync(path.join(extDir, "icons"), path.join(outDir, "icons"), { recursive: true });

console.log(`Built extension -> ${outDir}`);
