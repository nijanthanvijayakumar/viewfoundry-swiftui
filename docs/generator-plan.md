# Generator Plan And Fixtures

Phase 0 defines the first real SwiftUI generator boundary. It does not
implement generation, provider calls, or production SwiftUI output.

## Architecture

The next generator phase should replace only the mocked generation step in
`packages/runtime/src/pipeline.ts`. Request validation, mockup stub artifacts,
sandbox build, screenshot capture, diffing, and final report writing keep their
current boundaries.

Generator flow:

1. Normalize the `RuntimeRequest` into a `DesignBrief`.
2. Convert the brief into a small internal view model.
3. Lower the model into plain SwiftUI source and asset metadata.
4. Write generated files under `.viewfoundry/runs/<run-id>/swiftui/`.
5. Copy the entry view into
   `examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift`.
6. Write `swiftui/generation-report.json` using the current
   `SwiftUIGenerationOutput` shape.

The runtime contract and schema are unchanged for this phase. The existing
`generation-report.json` fields are enough for first generator acceptance:

- `entryFile`
- `sourceFiles`
- `assetFiles`
- `unsupportedRequestParts`
- `assumptions`

Add schema fields later only when a generator PR needs data that cannot fit
those fields.

## First Supported Subset

The first real generator should support one inspectable iOS screen:

- Root `ZStack` or `VStack`.
- System background colors only.
- Text blocks with `.caption`, `.headline`, `.title`, and `.body`.
- Static spacing, padding, alignment, and safe-area behavior.
- Optional primary button using `Button` with text label.
- Optional SF Symbol image if the request names a generic symbol need.
- No custom fonts, network images, remote assets, animations, navigation,
  lists, forms, tab bars, charts, maps, or data binding.

Unsupported request parts must be recorded in `unsupportedRequestParts`; they
must not be silently dropped.

## Deterministic Fixtures

Generator fixtures should be checked in under:

```text
packages/runtime/tests/fixtures/generator/
  onboarding-basic/
    request.json
    expected/ViewFoundryGeneratedView.swift
    expected/generation-report.json
  dense-settings/
    request.json
    expected/ViewFoundryGeneratedView.swift
    expected/generation-report.json
  unsupported-parts/
    request.json
    expected/ViewFoundryGeneratedView.swift
    expected/generation-report.json
```

Fixture rules:

- Use stable JSON ordering and newline-terminated files.
- Keep expected SwiftUI formatted by the generator, not hand-prettified after
  generation.
- Match generated Swift exactly for unit tests.
- Assert unsupported features in `generation-report.json`.
- Do not update expected fixtures during normal test runs.
- Require an explicit update command if fixture refresh is added later.

Initial fixture meanings:

- `onboarding-basic`: single-screen onboarding using title, body, and primary
  button.
- `dense-settings`: stacked labels and short rows without scrolling.
- `unsupported-parts`: request containing out-of-subset features, with clear
  unsupported metadata and a conservative fallback view.

## Acceptance Evidence

Generator PRs must provide these checks before review:

- Unit fixture tests compare generated Swift and `generation-report.json`.
- `npm run check` passes.
- `npm run pipeline:mock` still writes a blocked report when screenshot and diff
  are absent.
- `npm run sandbox:build` builds or skips only because Xcode is unavailable.
- When simulator tooling is available, capture a primary screenshot and run
  `npm run diff:image`; include artifact paths in the PR.

A generator unit test proves deterministic source output only. Visual
acceptance still requires sandbox build, screenshot, and diff evidence.

## Stubbed Vs Real

Real in the next phase:

- Deterministic request-to-view-model lowering.
- Deterministic SwiftUI source rendering for the supported subset.
- Generation report metadata for assumptions and unsupported parts.
- Fixture tests for source and report output.

Still stubbed:

- Image provider calls.
- Semantic visual analysis.
- Production-grade SwiftUI app architecture.
- Broad component library.
- All-device pixel perfection.
- Design-tool plugins.

## Review Rules

Generator PRs must keep implementation and fixture changes small enough to
review. Do not mix provider calls, screenshot runner rewrites, schema changes,
or visual diff algorithm changes into the first generator PR unless a follow-up
issue explicitly requests them.
