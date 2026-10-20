import { exportSeeds } from "../src/seed_export.ts";

const baseUrl = process.argv[2];
const outDir = process.argv[3] ?? "seeds";

if (!baseUrl || baseUrl === "--help" || baseUrl === "-h") {
  console.error("Usage: node scripts/export_seeds.ts <baseUrl> [outDir=seeds]");
  console.error(
    "Example: node scripts/export_seeds.ts http://localhost:8787 seeds",
  );
  process.exit(1);
}

try {
  const exported = await exportSeeds({
    baseUrl,
    outDir,
  });

  if (exported.length === 0) {
    console.log(`No system account module commits found on ${baseUrl}.`);
  } else {
    console.log(
      `Successfully exported ${exported.length} modules to ${outDir}: ${exported.join(", ")}`,
    );
  }
} catch (error) {
  console.error(
    "Failed to export seeds:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
}
