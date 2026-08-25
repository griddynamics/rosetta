0. Load project context in each subagent
1. Create a branch for the entire work.
2. Implement issue reliably, validate it fully, run/check locally, always follow `docs/ARCHTIECTURE.md`.
3. If fixing multiple issues => combine them in contextually disjoint areas => make one subagent to solve few issues at once in its own worktree.
4. Merge all worktrees with all implementation into one branch/PR. Make sure PR closes those issues.
5. Merge 3-way semantically (not mechanically) - re-read if two issues were touching the same file.
6. Review yourself ALL changes in the branch once all done - and test merged code. 
7. If questions - try to figure out yourself -> ask advisor -> ask user. Never disregard/postpone, especially concerns.

If issue is not simple/trivial => YOU MUST USE FLOW `coding-flow` AND FULLY FOLLOW IT!