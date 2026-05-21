# Privacy

`agent-skills-ts-sdk` is an open-source TypeScript library. The library itself
does not operate a hosted service, collect analytics, or transmit data to the
package maintainers.

At runtime, the library parses and validates skill content supplied by the
consuming application. Applications that use this package control where skill
content is loaded from, how validation results are stored, and whether any
parsed data is sent to another service.

This repository uses development tools such as package managers and CI
services. Those tools may have their own telemetry or logs when contributors
run them or when maintainers run CI. That behavior is outside the runtime
behavior of the published library.
