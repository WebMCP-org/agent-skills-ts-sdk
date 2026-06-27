# agent-skills-ts-sdk playground

Interactive browser-run SKILL.md editor for `agent-skills-ts-sdk`.

```bash
vp install --frozen-lockfile
vp run playground:dev
```

The React app imports the local SDK source and shows browser-side parsing,
validation, token estimation, prompt generation, patch creation, IndexedDB
storage, raw/rendered Markdown previews, and a CopilotKit-rendered mock agent
transcript. The Worker is intentionally empty except for `/health`; the demo
logic runs in the browser.

Production deploys are owned by Cloudflare's GitHub integration. Configure a
Workers project for this repo with:

- Build command: `vp install --frozen-lockfile && cd playground && vp build`
- Deploy command: `cd playground && vp exec wrangler deploy --config dist/agent_skills_ts_sdk_playground/wrangler.json`
