import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("\n🌿 Starting STILL E-Book Store (Backend + Frontend)...\n");

const backend = spawn(`${npmCmd} run dev`, {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
  shell: true,
});

const frontend = spawn(`${npmCmd} run dev`, {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
  shell: true,
});

const killProcess = (child) => {
  if (!child || !child.pid) return;
  if (isWin) {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: "ignore" });
    } catch {}
  } else {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
};

const cleanup = (code = 0) => {
  killProcess(backend);
  killProcess(frontend);
  process.exit(code);
};

process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));
process.on("exit", () => cleanup(0));
