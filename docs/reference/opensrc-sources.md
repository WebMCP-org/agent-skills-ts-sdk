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

Common inspections:

```bash
rg "parse" "$(vp exec opensrc path github:agentskills/agentskills)/skills-ref/src/skills_ref"
rg "validate" "$(vp exec opensrc path github:agentskills/agentskills)/skills-ref/tests"
find "$(vp exec opensrc path github:anthropics/skills)" -name SKILL.md
find "$(vp exec opensrc path github:vercel-labs/agent-skills)" -name SKILL.md
```

Do not commit files from `~/.opensrc/`; cite paths or upstream URLs in comments
and docs instead.
