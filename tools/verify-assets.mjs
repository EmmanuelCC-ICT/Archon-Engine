import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoots = ["index.template.html", "css", "js"];
const assetPattern = /assets\/[A-Za-z0-9_./-]+\.(?:webp|mp3|wav)/g;
const legacyPngPattern = /assets\/[A-Za-z0-9_./-]+\.png/g;

async function listFiles(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const entry = await stat(absolutePath);

  if (entry.isFile()) {
    return [relativePath];
  }

  const children = await readdir(absolutePath, { withFileTypes: true });
  const nested = await Promise.all(
    children.map((child) => listFiles(path.join(relativePath, child.name)))
  );

  return nested.flat();
}

const sourceFiles = (await Promise.all(sourceRoots.map(listFiles))).flat();
const assetFiles = (await listFiles("assets")).sort();
const referencedAssets = new Set();
const legacyReferences = [];

for (const sourceFile of sourceFiles) {
  const source = await readFile(path.join(rootDir, sourceFile), "utf8");

  for (const match of source.matchAll(assetPattern)) {
    referencedAssets.add(match[0]);
  }

  for (const match of source.matchAll(legacyPngPattern)) {
    legacyReferences.push(`${sourceFile}: ${match[0]}`);
  }
}

const missing = [...referencedAssets].filter((file) => !assetFiles.includes(file)).sort();
const unreferenced = assetFiles.filter((file) => !referencedAssets.has(file));
const metadataFiles = assetFiles.filter((file) => path.basename(file) === ".DS_Store");
const totalBytes = (
  await Promise.all(assetFiles.map((file) => stat(path.join(rootDir, file))))
).reduce((total, entry) => total + entry.size, 0);

const failures = [
  ...missing.map((file) => `Missing: ${file}`),
  ...unreferenced.map((file) => `Unreferenced: ${file}`),
  ...metadataFiles.map((file) => `Metadata file: ${file}`),
  ...legacyReferences.map((reference) => `Legacy PNG reference: ${reference}`)
];

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Asset verification passed: ${assetFiles.length} files, ${(totalBytes / 1048576).toFixed(2)} MiB.`
  );
}
