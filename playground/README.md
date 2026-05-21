# agent-skills-ts-sdk playground

Interactive SKILL.md editor and Cloudflare Worker example for `agent-skills-ts-sdk`.

```bash
pnpm --dir playground install
pnpm --dir playground dev
```

The React app imports the local SDK source and shows browser-side parsing,
validation, token estimation, prompt generation, patch creation, IndexedDB
storage, and raw/rendered Markdown previews. The Worker exposes sample skills so
the demo still includes a deployable server-side usage path.
