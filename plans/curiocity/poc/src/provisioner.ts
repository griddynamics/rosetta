/**
 * Plugin provisioner — placeholder for future MCP/plugin installation.
 *
 * Per the PoC brief: use the default user profile. No marketplace add, no
 * plugin install, no CLAUDE_CONFIG_DIR override. The Rosetta plugin is already
 * installed in the user's default profile.
 */

export interface ProvisionResult {
  success: boolean;
  message: string;
}

/**
 * No-op provisioner: Rosetta is already in the default profile.
 * Reserved for future per-case MCP or plugin injection.
 */
export async function installRosettaPlugin(_configDir: string): Promise<void> {
  console.log('[provisioner] Using default profile — Rosetta already installed, no action needed.');
}
