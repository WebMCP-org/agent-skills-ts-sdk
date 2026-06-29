# agent-skills-ts-sdk

## 2.4.2

### Patch Changes

- b5119c1: Externalize the `yaml` runtime dependency from the published bundle so Worker-oriented bundlers do not pre-analyze yaml's Node warning shim inside the SDK bundle.

## 2.4.1

### Patch Changes

- a1faac9: Replace resource-link regular expressions with linear parsers to avoid pathological backtracking on untrusted skill bodies.

## 2.4.0

### Minor Changes

- 4ff02bf: Add skill source and registry helpers for building model-facing prompts and read tools from in-memory skill entries or host-provided sources.

## 2.3.3

### Patch Changes

- Add an AgentSkills reference lock and CI drift check for the upstream specification and Python `skills-ref` package.
- Align parser, validator, disclosure, and patch behavior with the pinned AgentSkills reference.
- Document intentional conformance divergences for stricter SDK validation behavior.

## 2.3.1

## 2.3.0

## 2.2.0

## 2.1.0

## 2.0.13

## 2.0.12

## 2.0.11

## 2.0.10

### Patch Changes

- Remove noisy console.warn from toTransportSchema for empty schemas and schemas without root type. The normalization behavior is correct — no need to warn consumers.
