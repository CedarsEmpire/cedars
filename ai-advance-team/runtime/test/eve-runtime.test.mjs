import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url);
const agentRoot = new URL("../agent/", import.meta.url);
const subagentsRoot = new URL("../agent/subagents/", import.meta.url);

test("runtime contains one coordinator and exactly five specialist subagents", async () => {
  const names = (await readdir(subagentsRoot)).sort();
  assert.deepEqual(names, [
    "independent_qa",
    "release_governance",
    "repository_ci",
    "runtime_database",
    "security_compliance"
  ]);
  await access(new URL("../agent/agent.ts", import.meta.url));
  await access(new URL("../agent/instructions.md", import.meta.url));
});

test("all agent configs disable built-in tools and enforce per-session budgets", async () => {
  const files = [
    new URL("../agent/agent.ts", import.meta.url),
    ...((await readdir(subagentsRoot)).map((name) => new URL(`../agent/subagents/${name}/agent.ts`, import.meta.url)))
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /tool:\s*false/);
    assert.match(source, /sessionUsage/);
    assert.match(source, /sessionTimeoutMs/);
  }
});

test("no tools, connections, schedules, or sandbox extensions are mounted", async () => {
  for (const relative of ["tools", "connections", "schedules", "sandbox"]) {
    await assert.rejects(access(new URL(`../agent/${relative}`, import.meta.url)));
  }
  for (const name of await readdir(subagentsRoot)) {
    for (const relative of ["tools", "connections", "schedules", "sandbox"]) {
      await assert.rejects(access(new URL(`../agent/subagents/${name}/${relative}`, import.meta.url)));
    }
  }
});

test("HTTP channel is authenticated and refuses Production boot", async () => {
  const source = await readFile(new URL("../agent/channels/eve.ts", import.meta.url), "utf8");
  assert.match(source, /vercelOidc\(\)/);
  assert.match(source, /localDev\(\)/);
  assert.match(source, /VERCEL_ENV === "production"/);
  assert.doesNotMatch(source, /none\(\)/);
});

test("all role prompts retain CEDARS financial and release boundaries", async () => {
  const files = [
    new URL("../agent/instructions.md", import.meta.url),
    ...((await readdir(subagentsRoot)).map((name) => new URL(`../agent/subagents/${name}/instructions.md`, import.meta.url)))
  ];
  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.match(source, /NO FIAT TRANSACTIONS|fiat transactions/i);
    assert.match(source, /Production FROZEN|Production/i);
    assert.match(source, /ACCEPTED|acceptance/i);
  }
});
