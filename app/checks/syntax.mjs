import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const dir of ["src", "public", "checks"])
  for (const f of readdirSync(dir)) {
    if (!/\.(mjs|js)$/.test(f)) continue;
    const r = spawnSync(process.execPath, ["--check", `${dir}/${f}`], {
      stdio: "inherit",
    });
    if (r.status) process.exit(r.status);
  }
console.log("Syntax checks passed");
