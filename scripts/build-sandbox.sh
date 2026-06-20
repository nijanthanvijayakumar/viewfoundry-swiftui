#!/bin/sh
set -eu

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Skipping SwiftUI sandbox build: xcodebuild is unavailable."
  exit 0
fi

if ! xcodebuild -version >/dev/null 2>&1; then
  echo "Skipping SwiftUI sandbox build: xcodebuild is unavailable or unusable."
  exit 0
fi

destination="${VIEWFOUNDRY_SANDBOX_DESTINATION:-generic/platform=iOS Simulator}"
derived_data="${VIEWFOUNDRY_DERIVED_DATA:-.viewfoundry/DerivedData/Sandbox}"

xcodebuild \
  -project examples/Sandbox/ViewFoundrySandbox.xcodeproj \
  -scheme ViewFoundrySandbox \
  -destination "$destination" \
  -derivedDataPath "$derived_data" \
  CODE_SIGNING_ALLOWED=NO \
  build
