---
"agent-skills-ts-sdk": patch
---

Externalize the `yaml` runtime dependency from the published bundle so Worker-oriented bundlers do not pre-analyze yaml's Node warning shim inside the SDK bundle.
