#!/usr/bin/env bash
# Build the dedicated multiplayer server jar (no run).
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
echo "Building Shattered Pixel Dungeon multiplayer server..."
"${ROOT_DIR}/gradlew" :server:jar
echo
echo "Done. The jar is at: server/build/libs/server-3.3.8.jar"
echo "Run it with: ./run-server.sh [port]"