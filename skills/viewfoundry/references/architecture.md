# Architecture Reference

## Direction

ViewFoundry SwiftUI is plugin-first. The plugin and skill define the operating
contract around the local sandbox loop. The TypeScript runtime package is the
orchestration shell for that contract and now includes the first deterministic
SwiftUI emitter for the supported generator IR subset.

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
- Keep schema stubs in `schemas/runtime-contract.schema.json` until a concrete
  runtime gap requires expansion.
- Keep the TypeScript runtime in `packages/runtime` minimal and fixture-backed.
- The mocked pipeline may orchestrate stubs, artifacts, and optional diffing,
  but real imagegen and broad production SwiftUI generation remain explicit
  future work.

## Generator Emitter

The first generator boundary and fixture strategy live in
`docs/generator-plan.md`. The current emitter replaces only the mocked
generation step with deterministic runtime-request-to-generator-IR-to-SwiftUI
output for a small iOS subset. Runtime request/schema shapes remain unchanged
until an implementation issue proves a concrete gap.

## Out Of Scope Until Explicit

- Real imagegen provider calls.
- TypeScript-to-SwiftUI generation beyond the supported generator IR subset.
- Broad Swift package or app runtime surface.
- Design-tool plugins.
- All-device pixel-perfect claims.
- App Intents unless Siri, Shortcuts, Spotlight, widgets, or Control Center actions are required.
