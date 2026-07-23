import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const templatePath = path.join(rootDir, "index.template.html");
const outputPath = path.join(rootDir, "index.html");
const cssPath = path.join(rootDir, "css", "app.css");
const jsPaths = [
  ["js", "core", "namespace.js"],
  ["js", "data", "units.js"],
  ["js", "ethics", "landscape.js"],
  ["js", "core", "state.js"],
  ["js", "core", "board-rules.js"],
  ["js", "core", "ai.js"],
  ["js", "battle", "arena.js"],
  ["js", "ui", "renderer.js"],
  ["js", "core", "game.js"],
  ["js", "main.js"]
].map((parts) => path.join(rootDir, ...parts));

function escapeInlineScript(source) {
  return source.replace(/<\/script>/gi, "<\\/script>");
}

async function buildStandalone() {
  const [template, css, ...scripts] = await Promise.all([
    readFile(templatePath, "utf8"),
    readFile(cssPath, "utf8"),
    ...jsPaths.map((filePath) => readFile(filePath, "utf8"))
  ]);

  const bundledJs = scripts
    .map((source, index) => {
      const label = path.relative(rootDir, jsPaths[index]);
      return [
        "      /* " + label + " */",
        escapeInlineScript(source.trim()),
        ""
      ].join("\n");
    })
    .join("\n");

  const generated = template
    .replace("{{INLINE_CSS}}", css.trimEnd())
    .replace("{{INLINE_JS}}", bundledJs.trimEnd());

  await writeFile(outputPath, generated);
  process.stdout.write("Built standalone index.html\n");
}

buildStandalone().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
