#!/usr/bin/env node

// Prepends shebang line to dist/index.js for CLI execution via npx/global install.

import { readFileSync, writeFileSync } from "node:fs";

const filePath = "dist/index.js";
const shebang = "#!/usr/bin/env node\n";

const content = readFileSync(filePath, "utf8");
if (!content.startsWith("#!")) {
  writeFileSync(filePath, shebang + content);
}
