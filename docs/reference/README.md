# Reference Material

This repo implements the AgentSkills specification in TypeScript. Before
changing parser, validator, prompt, disclosure, patch, or conformance behavior,
check the relevant reference source through `opensrc`.

## Sources

- `github:agentskills/agentskills`: canonical specification repo and Python `skills-ref` implementation/example package.
- `github:anthropics/skills`: real-world skill examples and package layout conventions.
- `github:vercel-labs/agent-skills`: agent-skill examples and authoring conventions from the template ecosystem.

See `docs/reference/opensrc-sources.md` for suggested commands.

## Precedence

When sources disagree, use this order:

1. Official AgentSkills specification.
2. `agentskills/agentskills` Python `skills-ref` behavior and tests, read via `opensrc`.
3. Existing `agent-skills-ts-sdk` documented public API and test fixtures.
4. Real-world examples from `anthropics/skills` and `vercel-labs/agent-skills`.

Document intentional divergences in `tests/conformance/allowlist.json`.
