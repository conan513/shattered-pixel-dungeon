#!/usr/bin/env bash
# Run the dedicated multiplayer server from the prebuilt jar (no gradle).
# Usage:  ./run-server.sh [port]   (default 18765)
set -e
PORT="${1:-18765}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SERVER_JAR="${ROOT_DIR}/server/build/libs/server-3.3.8.jar"
if [ ! -f "${SERVER_JAR}" ]; then
    echo "Server jar not found. Build it first with ./build-server.sh"
    exit 1
fi

CP="${SERVER_JAR}:${ROOT_DIR}/core/build/libs/core-3.3.8.jar:${ROOT_DIR}/SPD-classes/build/libs/SPD-classes-3.3.8.jar"

echo "Starting Shattered Pixel Dungeon multiplayer server on port ${PORT}..."
java -cp "${CP}" com.shatteredpixel.shatteredpixeldungeon.multiplayer.server.MultiplayerServer "${PORT}"