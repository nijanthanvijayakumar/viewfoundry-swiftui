# Runtime Contract

ViewFoundry SwiftUI is still scaffold-only. This contract defines the future
plugin runtime boundary before the TypeScript runner, SwiftUI generator,
simulator runner, imagegen integration, or visual diff loop exists. A buildable
SwiftUI sandbox host exists under `examples/Sandbox` for future generated views.

## V1 Promise

V1 promises a local, inspectable design-to-SwiftUI sandbox loop:

- accept one structured runtime request
- create one design brief from the request
- create or receive one imagegen mockup artifact
- generate plain SwiftUI files and local assets
- run pixel verification on one primary simulator/device target
- run optional extra-device smoke checks only after the primary target passes
- write local artifacts and a final report under one run directory

V1 does not promise production-ready codegen, hidden Swift runtime behavior,
all-device pixel perfection, cross-platform rendering, design-tool plugins, or
App Intents unless Siri, Shortcuts, Spotlight, widgets, or Control Center
actions are explicitly in scope.

The first generator plan is documented in
[generator-plan.md](generator-plan.md). The current emitter keeps this request
schema and artifact shape, using the existing `SwiftUIGenerationOutput` fields
unless implementation proves a schema gap.

## Local Artifact Root

Each run writes artifacts under:

```text
.viewfoundry/runs/<run-id>/
  request.json
  design-brief.json
  mockups/
    target.png
    mockup.json
  swiftui/
    Sources/
    Assets.xcassets/
    generation-report.json
  screenshots/
    primary.png
    smoke-<device-slug>.png
  diffs/
    primary-diff.png
    primary-report.json
  iteration-state.json
  final-report.json
```

Generated Swift files should stay plain and reviewable. The default app entry
point is `examples/Sandbox/ViewFoundrySandbox/ViewFoundrySandboxApp.swift`.
Generated output should enter through
`examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift`
until the generator issue defines a richer file layout.

## Runtime Request

The future runner accepts JSON matching
[`schemas/runtime-contract.schema.json`](../schemas/runtime-contract.schema.json).
The request shape is:

```json
{
  "prompt": "Build a compact onboarding screen for a habit tracker.",
  "targetPlatform": "ios",
  "primaryDevice": {
    "name": "iPhone 16",
    "os": "iOS 18",
    "appearance": "light"
  },
  "smokeDevices": [
    {
      "name": "iPhone SE",
      "os": "iOS 18",
      "appearance": "light"
    }
  ],
  "visualConstraints": {
    "style": ["plain SwiftUI", "large tap targets"],
    "layout": ["single screen", "no scrolling"],
    "accessibility": ["Dynamic Type friendly"],
    "avoid": ["custom runtime dependency"]
  }
}
```

Required fields:

- `prompt`
- `targetPlatform`
- `primaryDevice.name`

Optional fields:

- `primaryDevice.os`
- `primaryDevice.appearance`
- `smokeDevices`
- `visualConstraints`

## Artifact Shapes

`design-brief.json` records the normalized intent:

- `summary`
- `targetPlatform`
- `primaryDevice`
- `smokeDevices`
- `visualConstraints`
- `acceptanceCriteria`
- `outOfScope`

`mockups/mockup.json` records the target image:

- `kind`: `imagegen` or `provided`
- `prompt`
- `imagePath`
- `width`
- `height`
- `notes`

`mockups/imagegen-request.json` records the provider boundary before real image
generation exists:

- `provider`: `stub` or `imagegen`
- `prompt`
- `targetPlatform`
- `primaryDevice`
- `visualConstraints`
- `outputPath`
- `width`
- `height`
- `seed`

The local stub writes this metadata plus a deterministic placeholder PNG. It
must not require API keys or call a real image generation provider.

`swiftui/generation-report.json` records generated output:

- `entryFile`
- `sourceFiles`
- `assetFiles`
- `unsupportedRequestParts`
- `assumptions`

`screenshots/*.png` are simulator captures. Each screenshot has metadata in the
final report:

- `device.name`
- `device.os`
- `device.appearance`
- `path`
- `capturedAt`

`diffs/primary-report.json` records the primary visual comparison:

- `targetPath`
- `actualPath`
- `diffPath`
- `score`
- `threshold`
- `passed`
- `observations`

`iteration-state.json` records retry state:

- `runId`
- `attempt`
- `maxAttempts`
- `status`
- `lastError`
- `artifacts`

`final-report.json` is the handoff artifact:

- `runId`
- `status`
- `primaryPassed`
- `primaryScreenshot` when the primary screenshot was captured; includes
  `device.name`, `device.os`, `device.appearance`, `path`, and `capturedAt`;
  passed reports must include it
- `smokeResults`; passed smoke checks include `screenshot` metadata with
  `device.name`, `device.os`, `device.appearance`, `path`, and `capturedAt`,
  and must not include `error` or `failureArtifactPath`; failed smoke checks
  include `error` and `failureArtifactPath` and must not include `screenshot`
- `artifactRoot`
- `swiftuiEntryFile` when SwiftUI generation produced an entry file; passed
  reports must include it
- `diffReportPath` when the primary diff ran; passed reports must include it
- `steps` when an orchestrated pipeline ran; each item includes `step`,
  `status`, and optional `artifactPath` or `reason`
- `requestPath` when the request was persisted
- `designBriefPath` when a design brief was written
- `mockupPath` when a mockup artifact was written
- `targetImagePath` when a target mockup image was written
- `generationReportPath` when SwiftUI generation metadata was written
- `errors`
- `nextActions`

Passed reports must set `primaryPassed` to `true` and include primary screenshot
metadata. Passed smoke results record only `screenshot` metadata. Failed smoke
checks record `error` and `failureArtifactPath` instead of fabricating or
carrying a screenshot.

## Success Rules

The primary device is the only V1 pixel gate. A run is successful when:

- generated SwiftUI builds and runs in the sandbox host
- the primary screenshot is captured
- the primary visual diff score is at or above the configured threshold
- no blocking runtime error remains

Extra devices are smoke checks. They can fail without failing the primary pixel
gate, but the final report must list each smoke failure and its failure artifact
path.

## Error And Retry Boundaries

The runner may retry only bounded, local steps:

- imagegen mockup creation
- SwiftUI generation
- sandbox build/run
- screenshot capture
- visual diff

Each step must record its last error in `iteration-state.json`. The loop stops
when one of these happens:

- primary device passes
- `maxAttempts` is reached
- generated SwiftUI cannot build after retry
- simulator or screenshot capture is unavailable
- required request fields are missing
- visual constraints conflict with V1 non-goals

Retries must not mutate expected fixtures, delete prior attempts, or hide
unsupported request parts. Blocked reports before SwiftUI generation must not
fabricate `swiftuiEntryFile`.

## Future Entry Points

CLI shape:

```sh
viewfoundry run --input request.json --output .viewfoundry/runs/<run-id>
```

TypeScript API shape:

```ts
runViewFoundry(request: RuntimeRequest): Promise<FinalReport>
```

The CLI and API must produce the same artifact layout and final report shape.
No runner exists yet.
