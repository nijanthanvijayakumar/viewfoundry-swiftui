# Architecture Reference

## Direction

ViewFoundry SwiftUI is plugin-first. The plugin and skill define the operating contract before codegen exists. The TypeScript runtime package is the orchestration shell for that contract; generator work comes later, after the workflow, sandbox, and verification loop are explicit.

## V1 Contract

- Start from an imagegen mockup or provided screenshot.
- Normalize prompt, target platform, primary device, smoke devices, and visual
  constraints through `docs/runtime-contract.md`.
- Use the deterministic mockup stub for CI-safe imagegen contract coverage until
  a real provider issue is explicitly in scope.
- Build an inspectable SwiftUI sandbox view.
- Run one primary simulator/device target for pixel verification.
- Use extra-device checks as smoke tests, not a perfection promise.
- Keep the SwiftUI output plain, reviewable, and free of hidden runtime behavior.
- Write local run artifacts under `.viewfoundry/runs/<run-id>/`.
- Keep schema stubs in `schemas/runtime-contract.schema.json` until the
  TypeScript runner exists.
- Keep the TypeScript runtime in `packages/runtime` minimal until generation
  and simulator issues are in scope.

## Out Of Scope Until Explicit

- Real imagegen provider calls.
- TypeScript-to-SwiftUI generation beyond placeholder output.
- Broad Swift package or app runtime surface.
- Design-tool plugins.
- All-device pixel-perfect claims.
- App Intents unless Siri, Shortcuts, Spotlight, widgets, or Control Center actions are required.
