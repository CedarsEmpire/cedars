import { runTeam } from "./runner.mjs";

const selfCheck = process.argv.includes("--self-check");
const objective = selfCheck
  ? "Self-check the isolated read-only orchestration runtime using no external connectors."
  : process.argv.slice(2).join(" ");

if (!objective) {
  process.stderr.write("Usage: npm run self-check OR node src/cli.mjs <bounded objective>\n");
  process.exitCode = 2;
} else {
  const report = await runTeam({ objective, adapters: {} });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (selfCheck && report.results.length !== 6) process.exitCode = 1;
}
