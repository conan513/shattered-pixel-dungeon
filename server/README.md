# Multiplayer (Dedicated Server)

This module is a prototype of the network layer for Shattered Pixel Dungeon.
It provides a **dedicated multiplayer server** and a client-side transport that
lives in the `core` module under `com.shatteredpixel.shatteredpixeldungeon.multiplayer`.

The server is **authoritative for rooms/lobbies** and relays chat and gameplay
input between connected clients. Full game-state simulation (dungeon, heroes,
mobs) is intentionally left out of this prototype so the transport can be
validated first and co-op gameplay can be layered on top later.

## Architecture

- **Protocol** (`core/.../multiplayer/NetProtocol.java`): shared message types
  and defaults. Messages are newline-delimited JSON objects.
- **Client transport** (`core/.../multiplayer/NetClient.java`): connects to the
  server over TCP, parses messages on a background thread, and notifies the UI
  through `NetClient.Listener` callbacks (dispatched on the render thread).
- **Server** (`server/.../multiplayer/server/`): a standalone `MultiplayerServer`
  that accepts TCP connections, routes them into rooms, and relays chat/input.
- **UI**: a `MULTIPLAYER` button on the title screen opens `WndMultiplayer`,
  where the player enters the server host/port, name, and can create/join a
  room and chat.

## Running the server

From the repository root:

```bash
# build the modules
./gradlew :core:compileJava :server:compileJava

# run directly with the compiled classes
java -cp "server/build/classes/java/main;core/build/classes/java/main;SPD-classes/build/classes/java/main" \
     com.shatteredpixel.shatteredpixeldungeon.multiplayer.server.MultiplayerServer 18765
```

Optional first argument overrides the port (default `18765`).

## Connecting from the game

1. Launch the desktop build.
2. From the title screen press **MULTIPLAYER**.
3. Enter the server host (e.g. `localhost`) and port, your name, then **Connect**.
4. **Create Room** to get a 5-character room code, or **Join Room** with a code.
5. Share the code with a friend; once two players are in the room the lobby is
   ready for co-op gameplay to be added.

## Message reference

| Direction | Type        | Purpose                          |
|-----------|-------------|----------------------------------|
| C→S       | `hello`     | join with a display name         |
| C→S       | `create`    | create a new room                |
| C→S       | `join`      | join a room by code              |
| C→S       | `chat`      | send a chat line                 |
| C→S       | `input`     | send a gameplay action (dx,dy,cmd) |
| C→S       | `leave`     | leave the current room           |
| S→C       | `welcome`   | assigned player id               |
| S→C       | `roominfo`  | room code + member list          |
| S→C       | `pjoin`     | a player entered the room        |
| S→C       | `pleave`    | a player left the room           |
| S→C       | `chat`      | relayed chat line                |
| S→C       | `game`      | relayed gameplay payload         |
| S→C       | `error`     | human readable error             |
