# opensrc

Use Vercel Labs `opensrc` whenever Agent Skills reference source or real-world
skill examples are needed. Do not clone repos by hand for source lookup.

Canonical references for this repo:

```bash
vp exec opensrc fetch github:agentskills/agentskills
vp exec opensrc fetch github:anthropics/skills
vp exec opensrc fetch github:vercel-labs/agent-skills
```

`opensrc path` prints the local cache directory. Search from that command
output instead of committing machine-specific cache paths.

Useful lookups:

```bash
vp exec opensrc path github:agentskills/agentskills
vp exec opensrc path github:anthropics/skills
vp exec opensrc path github:vercel-labs/agent-skills
```

Use `agentskills/agentskills` as the behavioral reference. The AgentSkills.io
Python example/reference package lives inside that repo at `skills-ref/`; access
it through `opensrc path`, not a direct clone or `git+https://...#subdirectory`
checkout.

Use `vp run reference:check` to verify the pinned AgentSkills reference lock.
When upstream changes, run `vp run reference:update`, inspect the diff, then
align conformance tests or update `tests/conformance/allowlist.json`.

```bash
PY_REF="$(vp exec opensrc path github:agentskills/agentskills)/skills-ref"
rg "parse" "$PY_REF/src/skills_ref"
rg "validate" "$PY_REF/tests"
```

Use `anthropics/skills` and `vercel-labs/agent-skills` as example-skill corpora
and convention references, not as stricter sources of truth than the official
specification.
