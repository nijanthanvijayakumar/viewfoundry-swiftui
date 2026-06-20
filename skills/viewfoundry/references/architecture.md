# Architecture Reference

## Direction

ViewFoundry SwiftUI is plugin-first. The plugin and skill define the operating contract before codegen exists. TypeScript model and generator work comes later, after the workflow, sandbox, and verification loop are explicit.

## V1 Contract

- Start from an imagegen mockup or provided screenshot.
- Normalize prompt, target platform, primary device, smoke devices, and visual
  constraints through `docs/runtime-contract.md`.
- Build an inspectable SwiftUI sandbox view.
- Run one primary simulator/device target for pixel verification.
- Use extra-device checks as smoke tests, not a perfection promise.
- Keep the SwiftUI output plain, reviewable, and free of hidden runtime behavior.
- Write local run artifacts under `.viewfoundry/runs/<run-id>/`.
- Keep schema stubs in `schemas/runtime-contract.schema.json` until the
  TypeScript runner exists.

## Out Of Scope Until Explicit

- TypeScript-to-SwiftUI generation.
- Broad Swift package or app runtime surface.
- Design-tool plugins.
- All-device pixel-perfect claims.
- App Intents unless Siri, Shortcuts, Spotlight, widgets, or Control Center actions are required.
