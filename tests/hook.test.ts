import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";

const hookPath = path.resolve("hooks/subagent-start.js");

function runHook(stdinData: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [hookPath], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Hook exited with code ${code}`));
    });
    child.on("error", reject);
    child.stdin.write(stdinData);
    child.stdin.end();
  });
}

describe("SubagentStart Hook", () => {
  it("outputs valid JSON with additionalContext", async () => {
    const stdout = await runHook("{}");
    const output = JSON.parse(stdout);
    expect(output).toHaveProperty("additionalContext");
    expect(typeof output.additionalContext).toBe("string");
  });

  it("additionalContext is under 50 tokens", async () => {
    const stdout = await runHook("{}");
    const output = JSON.parse(stdout);
    const wordCount = output.additionalContext.split(/\s+/).length;
    expect(wordCount).toBeLessThan(50);
  });

  it("handles empty stdin", async () => {
    const stdout = await runHook("");
    const output = JSON.parse(stdout);
    expect(output).toHaveProperty("additionalContext");
  });
});
