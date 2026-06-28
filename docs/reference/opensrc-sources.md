# opensrc Sources

Cache the reference repos:

```bash
vp exec opensrc fetch github:agentskills/agentskills
vp exec opensrc fetch github:anthropics/skills
vp exec opensrc fetch github:vercel-labs/agent-skills
```

Locate cached paths:

```bash
vp exec opensrc path github:agentskills/agentskills
vp exec opensrc path github:anthropics/skills
vp exec opensrc path github:vercel-labs/agent-skills
```

Check pinned AgentSkills reference drift:

```bash
vp run reference:check
vp run reference:update
```

`reference:check` runs in CI and verifies the upstream specification,
`skills-ref` package config, source, lockfile, and tests against
`docs/reference/agentskills-reference.lock.json`. When it fails, run
`reference:update`, inspect the upstream changes, then align conformance tests
or document intentional divergences in `tests/conformance/allowlist.json`.

Common inspections:

```bash
PY_REF="$(vp exec opensrc path github:agentskills/agentskills)/skills-ref"
rg "parse" "$PY_REF/src/skills_ref"
rg "validate" "$PY_REF/tests"
sed -n '1,220p' "$PY_REF/src/skills_ref/parser.py"
find "$(vp exec opensrc path github:anthropics/skills)" -name SKILL.md
find "$(vp exec opensrc path github:vercel-labs/agent-skills)" -name SKILL.md
```

The AgentSkills.io Python example/reference package is the `skills-ref`
subdirectory of `github:agentskills/agentskills`; keep it managed through
`opensrc` instead of cloning the subdirectory separately.

Do not commit files from `~/.opensrc/`; cite paths or upstream URLs in comments
and docs instead.
