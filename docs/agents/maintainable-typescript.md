# Maintainable TypeScript

Use the installed `maintainable-typescript` skill before implementation or
review when it is available in the local Codex/agent environment.

Project-specific rules:

- Preserve the public package surface unless the change is explicitly a breaking release.
- Keep parser, validator, prompt, disclosure, and patch behavior covered by focused tests.
- Prefer pure functions and in-memory inputs; this package should stay storage-agnostic.
- Compare spec-sensitive behavior against `agentskills/agentskills` via `opensrc`.
- Avoid broad refactors in the same change as conformance fixes.
