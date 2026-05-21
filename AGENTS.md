<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

## Project-Specific Agent Setup

- Use Vercel Labs `opensrc` for Agent Skills specification/reference source: see `docs/agents/opensrc.md`.
- Use Miguel's `maintainable-typescript` skill before implementation or review when available: see `docs/agents/maintainable-typescript.md`.
- Read `docs/reference/README.md` before changing parser, validator, prompt, disclosure, or conformance behavior.
- Keep the published package shape compatible with `agent-skills-ts-sdk` consumers: `dist/index.js` and `dist/index.d.ts`.
- Keep parser and validator behavior aligned with the AgentSkills specification and Python reference implementation.
- Prefer focused behavior tests for parser, validator, prompt, disclosure, token estimation, unicode, and patch behavior.

<!-- opensrc:start -->

## Source Code Reference

Source code for Agent Skills reference material is cached at `~/.opensrc/` for
deeper inspection without committing vendored source.

See `docs/reference/opensrc-sources.md` for the canonical reference repos and
their intended use.

Use this source code when you need to compare behavior against the Python
`skills-ref` implementation/example package, inspect real-world skill examples,
or understand published agent-skill conventions.

### Fetching Source Code

To cache reference source without doing anything else, use:

```bash
vp exec opensrc fetch github:agentskills/agentskills
vp exec opensrc fetch github:anthropics/skills
vp exec opensrc fetch github:vercel-labs/agent-skills
```

### Reading Source Code

Use `opensrc path` inside other commands to search, read, or explore source. It
fetches on cache miss:

```bash
rg "parse_frontmatter" "$(vp exec opensrc path github:agentskills/agentskills)"
sed -n '1,220p' "$(vp exec opensrc path github:agentskills/agentskills)/skills-ref/src/skills_ref/parser.py"
PY_REF="$(vp exec opensrc path github:agentskills/agentskills)/skills-ref"
rg "validate" "$PY_REF/tests"
find "$(vp exec opensrc path github:anthropics/skills)" -name SKILL.md
```

<!-- opensrc:end -->
