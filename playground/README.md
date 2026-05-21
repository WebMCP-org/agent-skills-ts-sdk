# agent-skills-ts-sdk playground

Interactive browser-run SKILL.md editor for `agent-skills-ts-sdk`.

```bash
pnpm --dir playground install
pnpm --dir playground dev
```

The React app imports the local SDK source and shows browser-side parsing,
validation, token estimation, prompt generation, patch creation, IndexedDB
storage, raw/rendered Markdown previews, and a CopilotKit-rendered mock agent
transcript. The Worker is intentionally empty except for `/health`; the demo
logic runs in the browser.
