/**
 * Unit tests for plan-io.ts — readPlanWithRetry and atomicWriteWithBackup.
 * Implements FR-SHRD-0009 (read resilience) and FR-PLAN-0024 (atomic write with rename-as-guard).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { readPlanWithRetry, atomicWriteWithBackup } from "../../../src/shared/plan-io.js";
import type { Plan } from "../../../src/commands/plan/core.js";
import { savePlan } from "../../../src/commands/plan/core.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "rosettify-planio-"));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function planFile(name = "plan.json"): string {
  return path.join(tmpDir, name);
}

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    name: "Test Plan",
    description: "",
    status: "open",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    previous_version: null,
    phases: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// readPlanWithRetry — FR-SHRD-0009
// ---------------------------------------------------------------------------

describe("readPlanWithRetry — FR-SHRD-0009 happy path", () => {
  // FR-SHRD-0009 — file exists: parse and return it
  it("reads and returns plan when file exists", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Hello Plan" }));
    const result = await readPlanWithRetry<Plan>(file);
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Hello Plan");
  });

  // FR-PLAN-0017 — back-compat: injects previous_version:null for legacy plans lacking the field
  it("injects previous_version:null for legacy plans without the field", async () => {
    const file = planFile();
    // Write raw JSON without previous_version field
    const legacy = {
      name: "Legacy",
      description: "",
      status: "open",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      phases: [],
    };
    fs.writeFileSync(file, JSON.stringify(legacy, null, 2));
    const result = await readPlanWithRetry<Plan>(file);
    expect(result).not.toBeNull();
    expect(result!.previous_version).toBeNull();
  });

  // FR-SHRD-0009 — no backup: return null immediately (no retry)
  it("returns null immediately when file missing and no backup exists", async () => {
    const file = planFile("nonexistent.json");
    const result = await readPlanWithRetry<Plan>(file);
    expect(result).toBeNull();
  });

  // FR-SHRD-0009 — parse failure: throws so caller can translate to plan_file_corrupted
  it("throws on parse failure (invalid JSON)", async () => {
    const file = planFile();
    fs.writeFileSync(file, "{{not valid json{{");
    await expect(readPlanWithRetry<Plan>(file)).rejects.toThrow();
  });
});

describe("readPlanWithRetry — FR-SHRD-0009 retry on missing-but-bak-exists", () => {
  // FR-SHRD-0009 — file missing but backup exists: retry until file reappears.
  // We create a backup (to trigger retry), then write the actual plan file after a short
  // delay — simulating the write cycle completing while reads are retrying.
  it("retries and succeeds when file reappears after backup-triggered delay", async () => {
    const file = planFile();
    const bakFile = file + ".bak000";
    const plan = makePlan({ name: "Retry Plan" });

    // Create a backup so retry is triggered (plan file does NOT exist yet)
    savePlan(bakFile, plan);

    // After a short delay (less than one retry interval of 100ms), write the plan file
    const writeDelay = 50; // PLAN_READ_RETRY_DELAY_MS is 100ms, so we write before first retry
    const writePromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        savePlan(file, plan);
        resolve();
      }, writeDelay);
    });

    // Start read — it will see backup exists, wait 100ms, then re-check
    const [result] = await Promise.all([
      readPlanWithRetry<Plan>(file),
      writePromise,
    ]);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("Retry Plan");
  });

  // FR-SHRD-0009 acceptance: "Given: plan file missing AND a matching backup file exists.
  // When: a read subcommand is invoked. Then: it retries every 100 ms up to 50 times before
  // returning plan_not_found." This test covers the exhaustion-after-retries branch.
  it(
    "returns null after PLAN_READ_MAX_RETRIES when file never reappears (FR-SHRD-0009 retry exhaustion)",
    async () => {
      const file = planFile();
      const bakFile = file + ".bak000";
      const plan = makePlan({ name: "Never-Restored Plan" });

      // Create a backup so retry is triggered, but never create the plan file.
      savePlan(bakFile, plan);

      const result = await readPlanWithRetry<Plan>(file);

      // After PLAN_READ_MAX_RETRIES exhausted retries, readPlanWithRetry returns null.
      // Caller subcommands translate null to plan_not_found (verified in next/show-status/query tests).
      expect(result).toBeNull();
    },
    // Real-time budget for 50 retries × 100ms = ~5s; allow generous timeout for slow CI.
    20000,
  );
});

// ---------------------------------------------------------------------------
// atomicWriteWithBackup — FR-PLAN-0024
// ---------------------------------------------------------------------------

describe("atomicWriteWithBackup — FR-PLAN-0024 happy path", () => {
  // FR-PLAN-0024 — happy path: produces .bak000 on first write
  it("creates first backup with index 000 and writes new plan", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Original" }));

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "done", updated: { ...plan, name: "Updated", updated_at: new Date().toISOString() } }),
      savePlan,
    );

    expect(result.ok).toBe(true);
    expect(result.result!.backupPath).toContain(".bak000");
    expect(fs.existsSync(result.result!.backupPath!)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);

    // Verify backup contains previous content
    const bak = JSON.parse(fs.readFileSync(result.result!.backupPath!, "utf8")) as Plan;
    expect(bak.name).toBe("Original");

    // Verify new file has updated content
    const updated = JSON.parse(fs.readFileSync(file, "utf8")) as Plan;
    expect(updated.name).toBe("Updated");
  });

  // FR-PLAN-0024 — second write produces .bak001
  it("produces .bak001 on second write (sequential naming)", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "v0" }));

    // First write → .bak000
    await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "r1", updated: { ...plan, name: "v1", updated_at: new Date().toISOString() } }),
      savePlan,
    );

    // Second write → .bak001
    const result2 = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "r2", updated: { ...plan, name: "v2", updated_at: new Date().toISOString() } }),
      savePlan,
    );

    expect(result2.ok).toBe(true);
    expect(result2.result!.backupPath).toContain(".bak001");
    expect(fs.existsSync(file.replace(".json", ".json.bak000"))).toBe(true);
    expect(fs.existsSync(file.replace(".json", ".json.bak001"))).toBe(true);
  });

  // FR-PLAN-0024 — previous_version set correctly on written plan
  it("sets previous_version to the backup path on the written plan", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Original" }));

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "ok", updated: { ...plan, updated_at: new Date().toISOString() } }),
      savePlan,
    );

    expect(result.ok).toBe(true);
    const written = JSON.parse(fs.readFileSync(file, "utf8")) as Plan;
    expect(written.previous_version).toBe(result.result!.backupPath);
  });

  // FR-PLAN-0024 — retention: write 7 times, expect only 5 backups (bak002..bak006)
  it("prunes oldest backups beyond retention (write 7, keep 5)", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "v0" }));

    for (let i = 1; i <= 7; i++) {
      await atomicWriteWithBackup<Plan, string>(
        file,
        (plan) => ({ ok: true, result: `r${i}`, updated: { ...plan, name: `v${i}`, updated_at: new Date().toISOString() } }),
        savePlan,
        { retention: 5 },
      );
    }

    // After 7 writes: bak000..bak006 created. Retention=5 keeps newest 5: bak002..bak006.
    const dir = path.dirname(file);
    const basename = path.basename(file);
    const backups = fs.readdirSync(dir).filter((e) => e.startsWith(basename + ".bak"));
    expect(backups.length).toBe(5);

    // Oldest two should be pruned
    expect(fs.existsSync(file + ".bak000")).toBe(false);
    expect(fs.existsSync(file + ".bak001")).toBe(false);
    // Newest five must exist
    for (let i = 2; i <= 6; i++) {
      const padded = String(i).padStart(3, "0");
      expect(fs.existsSync(file + `.bak${padded}`)).toBe(true);
    }
  });
});

describe("atomicWriteWithBackup — FR-PLAN-0024 mutation ok:false bubbles without retry", () => {
  // FR-PLAN-0024 — mutation returning ok:false bubbles immediately without retry
  it("returns mutation error immediately without writing backup", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Original" }));

    let callCount = 0;
    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (_plan) => {
        callCount++;
        return { ok: false, error: "target_not_found" };
      },
      savePlan,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("target_not_found");
    expect(callCount).toBe(1); // no retry
    // No backup created
    const dir = path.dirname(file);
    const basename = path.basename(file);
    const backups = fs.readdirSync(dir).filter((e) => e.startsWith(basename + ".bak"));
    expect(backups.length).toBe(0);
  });
});

describe("atomicWriteWithBackup — FR-PLAN-0024 rename failure (bak slot blocked) uses next available slot", () => {
  // FR-PLAN-0024 — when bak000 slot is blocked (dir), the cycle fails the rename,
  // restarts from step 1, finds bak000 (dir) as existing, computes bak001 as next slot,
  // and succeeds. Demonstrates the retry loop finds the next available backup name.
  it("succeeds using bak001 when bak000 directory is in the way", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Original" }));

    // Pre-create .bak000 as a DIRECTORY so first rename to bak000 fails
    const bakDir = file + ".bak000";
    fs.mkdirSync(bakDir, { recursive: true });

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "ok", updated: { ...plan, name: "Updated", updated_at: new Date().toISOString() } }),
      savePlan,
      { maxRetries: 10 },
    );

    // Cleanup the directory we created (if still there)
    try { fs.rmdirSync(bakDir); } catch { /* ignore — may have been consumed */ }

    // Should have succeeded using bak001 (skipping bak000 dir)
    expect(result.ok).toBe(true);
    expect(result.result!.backupPath).toContain(".bak001");
    expect(fs.existsSync(result.result!.backupPath!)).toBe(true);
    expect(fs.existsSync(file)).toBe(true);
  });
});

describe("atomicWriteWithBackup — FR-PLAN-0024 max retries → backup_create_failed", () => {
  // FR-PLAN-0024 — exhausting retries returns backup_create_failed.
  // We simulate a permanent post-rename write failure by using a custom savePlan
  // that always throws. The write cycle: renames plan→bak, then tries to write, fails,
  // rolls back bak→plan, continues. After maxRetries attempts, returns backup_create_failed.
  it("returns backup_create_failed when all retries exhausted due to post-rename write failure", async () => {
    const file = planFile();
    savePlan(file, makePlan({ name: "Original" }));

    // Custom savePlan that always throws to simulate persistent write failure
    const failingSavePlan = (_filePath: string, _plan: Plan): void => {
      throw new Error("Simulated persistent write failure");
    };

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "ok", updated: { ...plan, updated_at: new Date().toISOString() } }),
      failingSavePlan,
      { maxRetries: 3 }, // 3 attempts, all fail due to write failure
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("backup_create_failed");
  });
});

describe("atomicWriteWithBackup — FR-PLAN-0024 file missing → plan_not_found", () => {
  it("returns plan_not_found when the plan file does not exist", async () => {
    const file = planFile("nonexistent.json");

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "ok", updated: { ...plan, updated_at: new Date().toISOString() } }),
      savePlan,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_not_found");
  });
});

describe("atomicWriteWithBackup — FR-PLAN-0024 corrupted plan → plan_file_corrupted", () => {
  it("returns plan_file_corrupted when existing plan has invalid JSON", async () => {
    const file = planFile();
    fs.writeFileSync(file, "{{invalid json{{");

    const result = await atomicWriteWithBackup<Plan, string>(
      file,
      (plan) => ({ ok: true, result: "ok", updated: { ...plan, updated_at: new Date().toISOString() } }),
      savePlan,
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe("plan_file_corrupted");
  });
});
