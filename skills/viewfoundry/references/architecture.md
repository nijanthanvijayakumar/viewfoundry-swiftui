# Architecture Reference

## Direction

ViewFoundry SwiftUI is plugin-first. The plugin and skill define the operating contract before codegen exists. TypeScript model and generator work comes later, after the workflow, sandbox, and verification loop are explicit.

## V1 Contract

- Start from an imagegen mockup or provided screenshot.
- Build an inspectable SwiftUI sandbox view.
- Run one primary simulator/device target for pixel verification.
- Use extra-device checks as smoke tests, not a perfection promise.
- Keep the SwiftUI output plain, reviewable, and free of hidden runtime behavior.

## Out Of Scope Until Explicit

- TypeScript-to-SwiftUI generation.
- Broad Swift package or app runtime surface.
- Design-tool plugins.
- All-device pixel-perfect claims.
- App Intents unless Siri, Shortcuts, Spotlight, widgets, or Control Center actions are required.
