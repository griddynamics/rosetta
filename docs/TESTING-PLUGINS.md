# Claude Code

```
# install marketplace once
claude plugin marketplace add ../../GAIN/rosetta/.claude-plugin/marketplace.json

# update as many times as you make changes
claude plugin marketplace update rosetta && claude plugin uninstall core@rosetta && claude plugin install core@rosetta
```

# Copilot

**Both** options must be tested

## Plugin testing

Add marketplace to `chat.plugins.marketplaces` in settings using using local files path. Example: `file:///Users/isolomatov/Sources/GAIN/rosetta`.
Go to agent customizations screen (settings gear icon in Copliot chat plane), click `Browse Marketplaces`, click `install` for `core`.

## Standalone testing (Jetbrains specifically)

1. Copy `core-copilot` contents to a `.github` folder in your repository
2. Copy the contents of `.github/rules/plugin-files-mode.md` into `.github/copilot-instructions.md` and append before the closing `</plugin_files_mode>` tag: `Rosetta plugin root: ".github", get_context_instructions: must read fully all five "cat .github/rules/bootstrap-*.md" files all lines. You MUST FOLLOW ALL instructions and then MUST select workflow and execute it. All workflows are stored in ".github/rules/<workflowtag>.md".`

# Codex

Copy `core-codex` content to the root of the repository.

# Cursor

Create `.cursor` folder in the repository. Copy contents of `core-cursor` to `.cursor` folder.

# Prompts reliability

```
I am a plugin developer. Take no actions or execute anything. ultrathink. How to improve which prompt for you to not jump to execution and instead follow rosetta flow? I can only modify hook prompts as of now. Instructions from the session start hook: /Users/isolomatov/Sources/GAIN/rosetta/instructions/r2/core/rules/bootstrap-*.md
```
