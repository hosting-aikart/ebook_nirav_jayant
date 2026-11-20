import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("\n🌿 Starting STILL E-Book Store (Backend + Frontend)...\n");

const backend = spawn(npmCmd, ["run", "dev"], {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
  shell: false,
});

const frontend = spawn(npmCmd, ["run", "dev"], {
  cwd: path.join(__dirname, "frontend"),
  stdio: "inherit",
  shell: false,
});

const cleanup = (code = 0) => {
  if (backend && !backend.killed) {
    try {
      backend.kill();
    } catch {}
  }
  if (frontend && !frontend.killed) {
    try {
      frontend.kill();
    } catch {}
  }
  process.exit(code);
};

backend.on("error", (err) => {
  console.error("Backend error:", err);
});

frontend.on("error", (err) => {
  console.error("Frontend error:", err);
});

backend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Backend process exited with code ${code}`);
  }
});

frontend.on("exit", (code) => {
  if (code !== 0 && code !== null) {
    console.error(`Frontend process exited with code ${code}`);
  }
});

process.on("SIGINT", () => cleanup(0));
process.on("SIGTERM", () => cleanup(0));
