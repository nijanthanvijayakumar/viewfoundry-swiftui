#!/bin/sh
set -eu

project_path="examples/Sandbox/ViewFoundrySandbox.xcodeproj"
scheme="ViewFoundrySandbox"
bundle_id="com.viewfoundry.sandbox"
swiftui_entry_file="examples/Sandbox/ViewFoundrySandbox/Generated/ViewFoundryGeneratedView.swift"

request_path="${VIEWFOUNDRY_RUNTIME_REQUEST:-examples/runtime-request.sample.json}"
run_id="${VIEWFOUNDRY_RUN_ID:-run-$(date -u +%Y%m%dT%H%M%SZ)-$$}"
artifact_root="${VIEWFOUNDRY_RUN_DIR:-.viewfoundry/runs/$run_id}"
simulator_override_destination="${VIEWFOUNDRY_SIMULATOR_DESTINATION:-${VIEWFOUNDRY_SIMULATOR_XCODE_DESTINATION:-${VIEWFOUNDRY_SANDBOX_DESTINATION:-}}}"
simulator_override_udid="${VIEWFOUNDRY_SIMULATOR_UDID:-${VIEWFOUNDRY_SIMULATOR_ID:-}}"
simulator_override_name="${VIEWFOUNDRY_SIMULATOR_NAME:-${VIEWFOUNDRY_DEVICE_NAME:-}}"
simulator_override_os="${VIEWFOUNDRY_SIMULATOR_OS:-${VIEWFOUNDRY_DEVICE_OS:-}}"
simulator_override_state="${VIEWFOUNDRY_SIMULATOR_STATE:-unknown}"
simulator_override_runtime="${VIEWFOUNDRY_SIMULATOR_RUNTIME_IDENTIFIER:-}"
screenshots_dir="$artifact_root/screenshots"
screenshot_path="$screenshots_dir/primary.png"
metadata_path="$artifact_root/screenshot-runner.json"
final_report_path="$artifact_root/final-report.json"
derived_data="${VIEWFOUNDRY_DERIVED_DATA:-$artifact_root/DerivedData}"
app_path="$derived_data/Build/Products/Debug-iphonesimulator/ViewFoundrySandbox.app"
build_log="$artifact_root/build.log"
simctl_log="$artifact_root/simctl.log"
selector_log="$artifact_root/simulator-selector.log"
devices_json="$artifact_root/simctl-devices.json"
request_meta_json="$artifact_root/request-device.json"
simulator_meta_json="$artifact_root/selected-simulator.json"
xcodebuild_cmd="${VIEWFOUNDRY_XCODEBUILD:-xcodebuild}"
xcrun_cmd="${VIEWFOUNDRY_XCRUN:-xcrun}"
settle_seconds="${VIEWFOUNDRY_SCREENSHOT_SETTLE_SECONDS:-2}"
started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
captured_at=""

request_device_name=""
request_device_os=""
request_appearance="unspecified"
selected_device_name=""
selected_device_os=""
selected_runtime_identifier=""
selected_udid=""
selected_state=""
xcode_destination=""
screenshot_captured="false"

mkdir -p "$screenshots_dir"

json_get() {
  node - "$1" "$2" <<'NODE'
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const value = data[process.argv[3]];
if (value !== undefined && value !== null) process.stdout.write(String(value));
NODE
}

write_report() {
  report_status="$1"
  error_step="${2:-}"
  error_message="${3:-}"
  error_retryable="${4:-false}"
  finished_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

  export VIEWFOUNDRY_REPORT_STATUS="$report_status"
  export VIEWFOUNDRY_ERROR_STEP="$error_step"
  export VIEWFOUNDRY_ERROR_MESSAGE="$error_message"
  export VIEWFOUNDRY_ERROR_RETRYABLE="$error_retryable"
  export VIEWFOUNDRY_RUN_ID_VALUE="$run_id"
  export VIEWFOUNDRY_ARTIFACT_ROOT="$artifact_root"
  export VIEWFOUNDRY_REQUEST_PATH="$request_path"
  export VIEWFOUNDRY_PROJECT_PATH="$project_path"
  export VIEWFOUNDRY_SCHEME="$scheme"
  export VIEWFOUNDRY_BUNDLE_ID="$bundle_id"
  export VIEWFOUNDRY_SWIFTUI_ENTRY_FILE="$swiftui_entry_file"
  export VIEWFOUNDRY_SCREENSHOT_PATH="$screenshot_path"
  export VIEWFOUNDRY_METADATA_PATH="$metadata_path"
  export VIEWFOUNDRY_FINAL_REPORT_PATH="$final_report_path"
  export VIEWFOUNDRY_APP_PATH="$app_path"
  export VIEWFOUNDRY_BUILD_LOG="$build_log"
  export VIEWFOUNDRY_SIMCTL_LOG="$simctl_log"
  export VIEWFOUNDRY_SELECTOR_LOG="$selector_log"
  export VIEWFOUNDRY_STARTED_AT="$started_at"
  export VIEWFOUNDRY_FINISHED_AT="$finished_at"
  export VIEWFOUNDRY_CAPTURED_AT="$captured_at"
  export VIEWFOUNDRY_REQUEST_DEVICE_NAME="$request_device_name"
  export VIEWFOUNDRY_REQUEST_DEVICE_OS="$request_device_os"
  export VIEWFOUNDRY_REQUEST_APPEARANCE="$request_appearance"
  export VIEWFOUNDRY_SELECTED_DEVICE_NAME="$selected_device_name"
  export VIEWFOUNDRY_SELECTED_DEVICE_OS="$selected_device_os"
  export VIEWFOUNDRY_SELECTED_RUNTIME_IDENTIFIER="$selected_runtime_identifier"
  export VIEWFOUNDRY_SELECTED_UDID="$selected_udid"
  export VIEWFOUNDRY_SELECTED_STATE="$selected_state"
  export VIEWFOUNDRY_SCREENSHOT_CAPTURED="$screenshot_captured"
  export VIEWFOUNDRY_XCODE_DESTINATION="$xcode_destination"

  node <<'NODE'
const fs = require("fs");

const env = process.env;
const status = env.VIEWFOUNDRY_REPORT_STATUS;
const finalStatus =
  status === "passed" ? "passed" : status === "failed" ? "failed" : "blocked";
const primaryPassed = finalStatus === "passed";
const error = env.VIEWFOUNDRY_ERROR_MESSAGE
  ? {
      step: env.VIEWFOUNDRY_ERROR_STEP,
      message: env.VIEWFOUNDRY_ERROR_MESSAGE,
      retryable: env.VIEWFOUNDRY_ERROR_RETRYABLE === "true"
    }
  : undefined;
const captured = env.VIEWFOUNDRY_SCREENSHOT_CAPTURED === "true";
const device = {
  name:
    env.VIEWFOUNDRY_SELECTED_DEVICE_NAME ||
    env.VIEWFOUNDRY_REQUEST_DEVICE_NAME ||
    "unknown",
  os:
    env.VIEWFOUNDRY_SELECTED_DEVICE_OS ||
    env.VIEWFOUNDRY_REQUEST_DEVICE_OS ||
    "unknown",
  appearance: env.VIEWFOUNDRY_REQUEST_APPEARANCE || "unspecified"
};
const screenshot = captured
  ? {
      device,
      path: env.VIEWFOUNDRY_SCREENSHOT_PATH,
      capturedAt: env.VIEWFOUNDRY_CAPTURED_AT
    }
  : undefined;
const finalReport = {
  runId: env.VIEWFOUNDRY_RUN_ID_VALUE,
  status: finalStatus,
  primaryPassed,
  ...(screenshot ? { primaryScreenshot: screenshot } : {}),
  smokeResults: [],
  artifactRoot: env.VIEWFOUNDRY_ARTIFACT_ROOT,
  swiftuiEntryFile: env.VIEWFOUNDRY_SWIFTUI_ENTRY_FILE,
  errors: error ? [error] : [],
  nextActions: primaryPassed
    ? []
    : captured
      ? ["Run visual diff as next stage. Pass requires diffReportPath in final report."]
    : ["Fix the reported simulator runner error, then rerun the screenshot command."]
};
const metadata = {
  runId: env.VIEWFOUNDRY_RUN_ID_VALUE,
  status,
  finalReportStatus: finalReport.status,
  startedAt: env.VIEWFOUNDRY_STARTED_AT,
  finishedAt: env.VIEWFOUNDRY_FINISHED_AT,
  ...(env.VIEWFOUNDRY_CAPTURED_AT
    ? { capturedAt: env.VIEWFOUNDRY_CAPTURED_AT }
    : {}),
  requestPath: env.VIEWFOUNDRY_REQUEST_PATH,
  artifactRoot: env.VIEWFOUNDRY_ARTIFACT_ROOT,
  projectPath: env.VIEWFOUNDRY_PROJECT_PATH,
  scheme: env.VIEWFOUNDRY_SCHEME,
  bundleId: env.VIEWFOUNDRY_BUNDLE_ID,
  xcodeDestination: env.VIEWFOUNDRY_XCODE_DESTINATION,
  appPath: env.VIEWFOUNDRY_APP_PATH,
  screenshotPath: env.VIEWFOUNDRY_SCREENSHOT_PATH,
  metadataPath: env.VIEWFOUNDRY_METADATA_PATH,
  finalReportPath: env.VIEWFOUNDRY_FINAL_REPORT_PATH,
  buildLogPath: env.VIEWFOUNDRY_BUILD_LOG,
  simctlLogPath: env.VIEWFOUNDRY_SIMCTL_LOG,
  selectorLogPath: env.VIEWFOUNDRY_SELECTOR_LOG,
  requestDevice: {
    name: env.VIEWFOUNDRY_REQUEST_DEVICE_NAME,
    os: env.VIEWFOUNDRY_REQUEST_DEVICE_OS,
    appearance: env.VIEWFOUNDRY_REQUEST_APPEARANCE
  },
  selectedDevice: {
    name: env.VIEWFOUNDRY_SELECTED_DEVICE_NAME,
    os: env.VIEWFOUNDRY_SELECTED_DEVICE_OS,
    appearance: env.VIEWFOUNDRY_REQUEST_APPEARANCE,
    udid: env.VIEWFOUNDRY_SELECTED_UDID,
    runtimeIdentifier: env.VIEWFOUNDRY_SELECTED_RUNTIME_IDENTIFIER,
    initialState: env.VIEWFOUNDRY_SELECTED_STATE
  },
  errors: error ? [error] : []
};

fs.writeFileSync(env.VIEWFOUNDRY_FINAL_REPORT_PATH, `${JSON.stringify(finalReport, null, 2)}\n`);
fs.writeFileSync(env.VIEWFOUNDRY_METADATA_PATH, `${JSON.stringify(metadata, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(metadata, null, 2)}\n`);
NODE
}

fail() {
  step="$1"
  message="$2"
  code="${3:-1}"
  retryable="${4:-false}"
  write_report "failed" "$step" "$message" "$retryable"
  echo "$message" >&2
  exit "$code"
}

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required for simulator screenshot runner metadata." >&2
  exit 127
fi

if ! node - "$request_path" "$request_meta_json" <<'NODE'
const fs = require("fs");

const requestPath = process.argv[2];
const outputPath = process.argv[3];
const raw = JSON.parse(fs.readFileSync(requestPath, "utf8"));
const primary = raw.primaryDevice ?? {};
const device = {
  name: process.env.VIEWFOUNDRY_DEVICE_NAME || primary.name,
  os: process.env.VIEWFOUNDRY_DEVICE_OS || primary.os || "",
  appearance:
    process.env.VIEWFOUNDRY_APPEARANCE ||
    primary.appearance ||
    "unspecified"
};

if (!device.name || typeof device.name !== "string") {
  throw new Error("primaryDevice.name is required in runtime request or VIEWFOUNDRY_DEVICE_NAME");
}

if (!["light", "dark", "unspecified"].includes(device.appearance)) {
  throw new Error("appearance must be light, dark, or unspecified");
}

fs.writeFileSync(outputPath, `${JSON.stringify(device, null, 2)}\n`);
NODE
then
  fail "request" "Runtime request could not be read. Set VIEWFOUNDRY_RUNTIME_REQUEST to a valid request JSON." 1 false
fi

request_device_name="$(json_get "$request_meta_json" name)"
request_device_os="$(json_get "$request_meta_json" os)"
request_appearance="$(json_get "$request_meta_json" appearance)"

if ! command -v "$xcodebuild_cmd" >/dev/null 2>&1; then
  fail "build" "xcodebuild is required for simulator screenshots. Install Xcode or set VIEWFOUNDRY_XCODEBUILD." 127 false
fi

if ! command -v "$xcrun_cmd" >/dev/null 2>&1; then
  fail "screenshot" "xcrun is required for simulator screenshots. Install Xcode command line tools or set VIEWFOUNDRY_XCRUN." 127 false
fi

if ! "$xcodebuild_cmd" -version >/dev/null 2>&1; then
  fail "build" "xcodebuild is unavailable or unusable. Check Xcode installation and xcode-select." 127 false
fi

if [ -n "$simulator_override_destination" ] || [ -n "$simulator_override_udid" ]; then
  if [ -z "$simulator_override_destination" ]; then
    simulator_override_destination="platform=iOS Simulator,id=$simulator_override_udid"
  fi

  selected_udid="${simulator_override_destination#*id=}"
  if [ "$selected_udid" = "$simulator_override_destination" ] || [ -z "$selected_udid" ]; then
    fail "screenshot" "VIEWFOUNDRY_SIMULATOR_DESTINATION must include id=<simulator-udid> when discovery is overridden." 1 false
  fi

  # remove any trailing tokens after comma
  selected_udid="${selected_udid%%,*}"
  selected_device_name="${simulator_override_name:-$request_device_name}"
  selected_device_os="${simulator_override_os:-$request_device_os}"
  selected_runtime_identifier="${simulator_override_runtime:-override}"
  selected_state="$simulator_override_state"
  xcode_destination="$simulator_override_destination"

  if ! node - "$simulator_meta_json" "$selected_device_name" "$selected_device_os" "$selected_runtime_identifier" "$selected_udid" "$selected_state" "$xcode_destination" <<'NODE'
const fs = require("fs");

const outputPath = process.argv[2];
const meta = {
  name: process.argv[3],
  os: process.argv[4],
  runtimeIdentifier: process.argv[5],
  udid: process.argv[6],
  state: process.argv[7],
  destination: process.argv[8]
};

fs.writeFileSync(outputPath, `${JSON.stringify(meta, null, 2)}\n`);
NODE
  then
    fail "screenshot" "Could not set simulator override metadata." 1 false
  fi
else
  if ! "$xcrun_cmd" simctl list devices available -j >"$devices_json" 2>"$simctl_log"; then
    fail "screenshot" "Could not list available simulators. See $simctl_log." 1 true
  fi

  if ! node - "$devices_json" "$request_device_name" "$request_device_os" "$simulator_meta_json" 2>"$selector_log" <<'NODE'
const fs = require("fs");

const devicesPath = process.argv[2];
const requestedName = process.argv[3];
const requestedOs = process.argv[4];
const outputPath = process.argv[5];
const payload = JSON.parse(fs.readFileSync(devicesPath, "utf8"));
const devicesByRuntime = payload.devices ?? {};

function runtimeInfo(identifier) {
  const suffix = identifier.split(".").pop() ?? identifier;
  const [platform = "unknown", ...versionParts] = suffix.split("-");
  const version = versionParts.join(".");
  return {
    identifier,
    platform,
    version,
    label: version ? `${platform} ${version}` : identifier
  };
}

function requestedVersion(os) {
  const match = os.match(/\d+(?:\.\d+)*/);
  return match ? match[0] : "";
}

function matchesOs(runtime, os) {
  if (!os) return true;
  const wantedVersion = requestedVersion(os);
  if (!wantedVersion) return runtime.label.toLowerCase().includes(os.toLowerCase());
  if (wantedVersion.includes(".")) return runtime.version === wantedVersion;
  return runtime.version === wantedVersion || runtime.version.startsWith(`${wantedVersion}.`);
}

function versionScore(version) {
  return version
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function compareVersions(left, right) {
  const a = versionScore(left);
  const b = versionScore(right);
  const max = Math.max(a.length, b.length);
  for (let index = 0; index < max; index += 1) {
    const delta = (b[index] ?? 0) - (a[index] ?? 0);
    if (delta !== 0) return delta;
  }
  return 0;
}

const candidates = [];
const available = [];

for (const [runtimeIdentifier, devices] of Object.entries(devicesByRuntime)) {
  const runtime = runtimeInfo(runtimeIdentifier);
  for (const device of devices) {
    if (!device.isAvailable) continue;
    available.push(`${device.name} (${runtime.label})`);
    if (device.name === requestedName && matchesOs(runtime, requestedOs)) {
      candidates.push({ device, runtime });
    }
  }
}

if (candidates.length === 0) {
  const osHint = requestedOs ? ` on ${requestedOs}` : "";
  const listed = available.length > 0 ? available.join(", ") : "none";
  console.error(`No available simulator named "${requestedName}"${osHint}. Available: ${listed}`);
  process.exit(1);
}

candidates.sort((left, right) => compareVersions(left.runtime.version, right.runtime.version));
const selected = candidates[0];
const metadata = {
  name: selected.device.name,
  os: selected.runtime.label,
  runtimeIdentifier: selected.runtime.identifier,
  udid: selected.device.udid,
  state: selected.device.state,
  destination: `platform=iOS Simulator,id=${selected.device.udid}`
};

  fs.writeFileSync(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
NODE
  then
    selector_error="$(node -e 'process.stdout.write(require("fs").readFileSync(process.argv[1], "utf8").trim())' "$selector_log" 2>/dev/null || true)"
    if [ -z "$selector_error" ]; then
      selector_error="Could not select simulator for $request_device_name."
    fi
    fail "screenshot" "$selector_error" 1 false
  fi
fi

selected_device_name="$(json_get "$simulator_meta_json" name)"
selected_device_os="$(json_get "$simulator_meta_json" os)"
selected_runtime_identifier="$(json_get "$simulator_meta_json" runtimeIdentifier)"
selected_udid="$(json_get "$simulator_meta_json" udid)"
selected_state="$(json_get "$simulator_meta_json" state)"
xcode_destination="$(json_get "$simulator_meta_json" destination)"

if ! "$xcodebuild_cmd" \
  -project "$project_path" \
  -scheme "$scheme" \
  -destination "$xcode_destination" \
  -derivedDataPath "$derived_data" \
  CODE_SIGNING_ALLOWED=NO \
  build >"$build_log" 2>&1; then
  fail "build" "Sandbox build failed. See $build_log." 1 true
fi

if [ ! -d "$app_path" ]; then
  fail "build" "Built sandbox app was not found at $app_path." 1 true
fi

if ! "$xcrun_cmd" simctl boot "$selected_udid" >>"$simctl_log" 2>&1; then
  if ! grep -qi "Booted" "$simctl_log"; then
    fail "screenshot" "Simulator boot failed. See $simctl_log." 1 true
  fi
fi

if ! "$xcrun_cmd" simctl bootstatus "$selected_udid" -b >>"$simctl_log" 2>&1; then
  fail "screenshot" "Simulator did not finish booting. See $simctl_log." 1 true
fi

if [ "$request_appearance" = "light" ] || [ "$request_appearance" = "dark" ]; then
  if ! "$xcrun_cmd" simctl ui "$selected_udid" appearance "$request_appearance" >>"$simctl_log" 2>&1; then
    fail "screenshot" "Could not set simulator appearance to $request_appearance. See $simctl_log." 1 true
  fi
fi

if ! "$xcrun_cmd" simctl install "$selected_udid" "$app_path" >>"$simctl_log" 2>&1; then
  fail "screenshot" "Could not install sandbox app on simulator. See $simctl_log." 1 true
fi

if ! "$xcrun_cmd" simctl launch "$selected_udid" "$bundle_id" >>"$simctl_log" 2>&1; then
  fail "screenshot" "Could not launch sandbox app on simulator. See $simctl_log." 1 true
fi

sleep "$settle_seconds"

if ! "$xcrun_cmd" simctl io "$selected_udid" screenshot "$screenshot_path" >>"$simctl_log" 2>&1; then
  fail "screenshot" "Could not capture simulator screenshot. See $simctl_log." 1 true
fi

captured_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
screenshot_captured="true"
write_report "blocked"
