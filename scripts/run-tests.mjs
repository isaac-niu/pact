import { spawn } from "node:child_process";

// The task factory's generic verifier appends Jest's --runInBand flag. Vitest
// does not implement that flag, so accept and discard it while preserving any
// other Vitest arguments developers intentionally pass.
const args = process.argv.slice(2).filter((arg) => arg !== "--runInBand");
const child = spawn("vitest", ["run", ...args], { stdio: "inherit", shell: process.platform === "win32" });

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
