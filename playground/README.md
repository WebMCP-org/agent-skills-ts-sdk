# agent-skills-ts-sdk playground

Interactive SKILL.md editor and Cloudflare Worker example for `agent-skills-ts-sdk`.

```bash
pnpm --dir playground install
pnpm --dir playground dev
```

The React app imports the local SDK source and shows parsing, validation, token
estimation, prompt generation, and patch creation. The Worker exposes sample
skills and a validation endpoint so the demo includes a server-side usage path.
