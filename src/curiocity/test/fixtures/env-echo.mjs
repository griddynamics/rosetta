// Tiny fork target for the env-scrub test: report this child's env keys/values
// back to the parent over IPC, then exit. Used to prove a forked child inherits
// ONLY the allow-listed env (§4).
process.send?.({ env: { ...process.env } });
setTimeout(() => process.exit(0), 10);
