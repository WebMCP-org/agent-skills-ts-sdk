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

Use `agentskills/agentskills` as the behavioral reference, especially
`skills-ref/src/skills_ref/*.py` and `skills-ref/tests`. Use `anthropics/skills`
and `vercel-labs/agent-skills` as example-skill corpora and convention
references, not as stricter sources of truth than the official specification.
