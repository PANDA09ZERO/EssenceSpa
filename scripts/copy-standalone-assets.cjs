const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");

if (!fs.existsSync(standalone)) process.exit(0);

fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });

const publicDirectory = path.join(root, "public");
if (fs.existsSync(publicDirectory)) {
  fs.cpSync(publicDirectory, path.join(standalone, "public"), { recursive: true });
}