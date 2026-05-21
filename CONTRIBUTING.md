# Contributing

Thanks for helping improve `agent-skills-ts-sdk`.

## Development

Install dependencies with Vite+:

```bash
vp install
```

Run the main checks before opening a pull request:

```bash
vp check
vp test run
vp run validate:package
```

## Implementation Notes

- Keep the public package shape compatible with the published package:
  `dist/index.js` and `dist/index.d.ts`.
- Keep parser and validator behavior aligned with the AgentSkills
  specification and the Python reference implementation where applicable.
- Add focused tests for parser, validator, prompt, disclosure, and patch
  behavior instead of broad snapshot tests.

## Releases

The release workflow validates the package, versions through Changesets, and
publishes through npm trusted publishing from
`WebMCP-org/agent-skills-ts-sdk`. See `docs/release.md`.
