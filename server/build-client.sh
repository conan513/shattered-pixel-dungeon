#!/usr/bin/env bash
# Build the desktop client into a runnable jar (no run).
# Output: desktop/build/libs/desktop-3.3.8.jar
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
echo "Building Shattered Pixel Dungeon desktop client..."
"${ROOT_DIR}/gradlew" :desktop:release
echo
echo "Done. The runnable jar is at: desktop/build/libs/desktop-3.3.8.jar"
echo "Run it with: java -jar desktop/build/libs/desktop-3.3.8.jar"