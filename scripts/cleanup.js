/**
 * Codebase cleanup script — run with: node scripts/cleanup.js
 *
 * This script:
 * 1. Removes scaffolding/one-off files that shouldn't be in the repo
 * 2. Moves fabric-*.ts files into src/fabric/ subdirectory
 * 3. Updates all imports referencing the moved files
 * 4. Removes the deprecated copilot-agent.ts
 * 5. Removes checked-in dist/ directory
 * 6. Cleans up after itself (deletes this script)
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function rm(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return;
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`  removed dir:  ${relPath}`);
  } else {
    fs.unlinkSync(full);
    console.log(`  removed file: ${relPath}`);
  }
}

function replaceInFile(relPath, search, replace) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return false;
  const content = fs.readFileSync(full, "utf8");
  if (!content.includes(search)) return false;
  fs.writeFileSync(full, content.replaceAll(search, replace), "utf8");
  console.log(`  updated: ${relPath}`);
  return true;
}

function moveFile(from, to) {
  const fullFrom = path.join(ROOT, from);
  const fullTo = path.join(ROOT, to);
  if (!fs.existsSync(fullFrom)) {
    console.log(`  skip (not found): ${from}`);
    return;
  }
  fs.mkdirSync(path.dirname(fullTo), { recursive: true });
  fs.copyFileSync(fullFrom, fullTo);
  fs.unlinkSync(fullFrom);
  console.log(`  moved: ${from} → ${to}`);
}

// ─── Step 1: Remove junk files ──────────────────────────────────────────────
console.log("\n🗑️  Step 1: Removing scaffolding & one-off files...\n");

const junkFiles = [
  "test-output.txt",
  "remove_files.bat",
  "remove_files.js",
  "build-test-push.bat",
  "create-dirs.js",
  "setup-structure.js",
  "IMPLEMENTATION_PLAN.md",
];

junkFiles.forEach(rm);

// ─── Step 2: Remove checked-in build output ─────────────────────────────────
console.log("\n🗑️  Step 2: Removing checked-in dist/ directory...\n");
rm("dist");

// ─── Step 3: Move fabric files to src/fabric/ ───────────────────────────────
console.log("\n📦 Step 3: Organizing fabric modules into src/fabric/...\n");

fs.mkdirSync(path.join(ROOT, "src", "fabric"), { recursive: true });

moveFile("src/fabric-client.ts", "src/fabric/client.ts");
moveFile("src/fabric-analytics.ts", "src/fabric/analytics.ts");
moveFile("src/fabric-workiq.ts", "src/fabric/workiq.ts");

// Create barrel export
const barrelContent = `export { FabricClient, getFabricConfig, type FabricConfig } from "./client.js";
export { AnalyticsPipeline, type AnalyticsPipelineOptions, type SkillMetric } from "./analytics.js";
export { WorkIQConnector, type ProductivityMetrics, type WorkIQEvent } from "./workiq.js";
`;

fs.writeFileSync(path.join(ROOT, "src", "fabric", "index.ts"), barrelContent, "utf8");
console.log("  created: src/fabric/index.ts (barrel export)");

// Fix internal imports within the moved files
replaceInFile("src/fabric/analytics.ts", '"./fabric-client.js"', '"./client.js"');
replaceInFile("src/fabric/workiq.ts", '"./fabric-client.js"', '"./client.js"');

// Fix test imports
replaceInFile(
  "tests/unit/fabric-analytics.test.ts",
  '"../../src/fabric-analytics.js"',
  '"../../src/fabric/analytics.js"',
);
replaceInFile(
  "tests/unit/fabric-analytics.test.ts",
  '"../../src/fabric-client.js"',
  '"../../src/fabric/client.js"',
);
replaceInFile(
  "tests/unit/fabric-client.test.ts",
  '"../../src/fabric-client.js"',
  '"../../src/fabric/client.js"',
);
replaceInFile(
  "tests/unit/fabric-client-enabled.test.ts",
  '"../../src/fabric-client.js"',
  '"../../src/fabric/client.js"',
);
replaceInFile(
  "tests/unit/fabric-workiq.test.ts",
  '"../../src/fabric-workiq.js"',
  '"../../src/fabric/workiq.js"',
);
replaceInFile(
  "tests/unit/fabric-workiq.test.ts",
  '"../../src/fabric-client.js"',
  '"../../src/fabric/client.js"',
);

// ─── Step 4: Remove deprecated copilot-agent.ts ─────────────────────────────
console.log("\n🗑️  Step 4: Removing deprecated copilot-agent.ts...\n");
rm("src/copilot-agent.ts");

// Update vitest coverage exclude (remove copilot-agent reference)
replaceInFile(
  "vitest.config.ts",
  'exclude: ["src/types/**", "src/copilot-agent.ts", "src/index.ts"]',
  'exclude: ["src/types/**", "src/index.ts"]',
);

// ─── Done ───────────────────────────────────────────────────────────────────
console.log("\n✅ Cleanup complete! Next steps:");
console.log("   1. Run: npm run build");
console.log("   2. Run: npm test");
console.log("   3. Delete this script: del scripts\\cleanup.js");
console.log("   4. Stage and commit: git add -A && git commit\n");
