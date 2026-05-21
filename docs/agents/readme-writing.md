# README And Prose Writing

Use the installed `crafting-effective-readmes` skill before creating,
restructuring, or materially updating `README.md`, package docs, or onboarding
docs.

Use the installed `writing` skill for public-facing prose such as:

- README sections
- API documentation
- release notes
- support, security, and privacy copy
- package descriptions and npm-facing text

Project-specific rules:

- Treat this as an open-source package README: lead with what the library does,
  install instructions, quick usage, API shape, compatibility, and contribution
  expectations.
- Keep examples aligned with the actual exported API in `src/index.ts`.
- Verify package commands against `package.json`; do not preserve stale template
  commands.
- Prefer short, direct prose over broad claims about agent ecosystems.
- Use `opensrc` reference material when documenting spec behavior or parity with
  `skills-ref`.
