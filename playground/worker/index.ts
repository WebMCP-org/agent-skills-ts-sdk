import { estimateTokens, toPrompt, validateSkillContent } from "../../src/index.ts";

type SampleSkill = {
  content: string;
  description: string;
  id: string;
  name: string;
};

const sampleSkills: SampleSkill[] = [
  {
    id: "readme-writer",
    name: "readme-writer",
    description: "Drafts README updates for TypeScript package maintainers.",
    content: `---
name: readme-writer
description: Draft README sections for TypeScript package maintainers when public docs need clearer installation, usage, API, or release guidance.
license: MIT
compatibility: Works best in npm package repositories with package.json and TypeScript source.
allowed-tools: Read Grep Glob
---
# README Writer

Use this skill when README changes need to explain a TypeScript package to users.

## Workflow

1. Read \`package.json\`, the public exports, and existing README sections.
2. Identify the reader: evaluator, first-time user, contributor, or maintainer.
3. Keep install and first-use examples short enough to run in one sitting.
4. Name compatibility constraints directly.
5. Prefer concrete examples over broad claims.

## Output

Return replacement-ready Markdown and call out any facts that need maintainer confirmation.
`,
  },
  {
    id: "cloudflare-worker-review",
    name: "cloudflare-worker-review",
    description:
      "Reviews Worker examples for deployable request handling and package-demo clarity.",
    content: `---
name: cloudflare-worker-review
description: Review Cloudflare Worker examples for small SDK repos before publishing demos or docs.
compatibility: Cloudflare Workers, Vite, and TypeScript.
allowed-tools: Read Grep Bash(npm:*) Bash(pnpm:*)
---
# Cloudflare Worker Review

Check that the Worker example is easy to run and demonstrates the package without hiding important code.

## Review Points

- The Worker should expose a narrow, inspectable API.
- Responses should include status codes and JSON content types.
- The example should avoid production-only configuration.
- The README should explain local development and deployment separately.
`,
  },
];

export default {
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/examples") {
      return jsonResponse({
        skills: sampleSkills.map(({ content, ...sample }) => ({
          ...sample,
          tokens: estimateTokens(content),
        })),
      });
    }

    if (url.pathname.startsWith("/api/examples/")) {
      const id = decodeURIComponent(url.pathname.slice("/api/examples/".length));
      const skill = sampleSkills.find((sample) => sample.id === id);
      if (!skill) {
        return jsonResponse({ error: "Sample skill not found" }, { status: 404 });
      }

      return jsonResponse({
        ...skill,
        prompt: toPrompt([{ content: skill.content, location: `samples/${skill.id}/SKILL.md` }]),
        tokens: estimateTokens(skill.content),
        validationErrors: validateSkillContent(skill.content),
      });
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies { fetch(request: Request): Promise<Response> };

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(body, null, 2), {
    ...init,
    headers,
  });
}
