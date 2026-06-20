# Runtime Contract

ViewFoundry SwiftUI is still scaffold-only. This contract defines the future
plugin runtime boundary before the TypeScript runner, SwiftUI generator,
simulator runner, imagegen integration, or visual diff loop exists.

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
point remains the sandbox template until a real host project exists.

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

`swiftui/generation-report.json` records generated output:

- `entryFile`
- `sourceFiles`
- `assetFiles`
- `unsupportedRequestParts`
- `assumptions`

`screenshots/*.png` are simulator captures. Each screenshot has metadata in the
final report:

- `device`
- `os`
- `appearance`
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
- `smokeResults`
- `artifactRoot`
- `swiftuiEntryFile`
- `diffReportPath`
- `errors`
- `nextActions`

## Success Rules

The primary device is the only V1 pixel gate. A run is successful when:

- generated SwiftUI builds and runs in the sandbox host
- the primary screenshot is captured
- the primary visual diff score is at or above the configured threshold
- no blocking runtime error remains

Extra devices are smoke checks. They can fail without failing the primary pixel
gate, but the final report must list each smoke failure and its artifact path.

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
unsupported request parts.

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
