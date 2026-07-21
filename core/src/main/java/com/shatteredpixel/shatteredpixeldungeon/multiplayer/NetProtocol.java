/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Multiplayer network protocol shared between the client (core module) and
 * the dedicated server (server module). Messages are newline-delimited JSON
 * objects. Keeping the protocol in one place avoids client/server drift.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer;

public class NetProtocol {

	// Default connection details (can be overridden by the player in the UI).
	public static final String DEFAULT_HOST = "localhost";
	public static final int DEFAULT_PORT = 18765;

	// Transmission framing: messages are UTF-8 JSON objects terminated by '\n'.
	public static final String DELIMITER = "\n";

	// Message type field name used by every packet.
	public static final String FIELD_TYPE = "t";

	// ─── Client -> Server message types ─────────────────────────────────────
	public static final String C_HELLO     = "hello";   // join with a display name
	public static final String C_CREATE    = "create";  // create a new room/lobby
	public static final String C_JOIN      = "join";    // join an existing room by code
	public static final String C_CHAT      = "chat";    // lobby/in-game chat line
	public static final String C_READY     = "ready";   // toggle ready status
	public static final String C_HERO      = "hero";    // select hero class
	public static final String C_INPUT     = "input";   // gameplay action (dx,dy,cmd)
	public static final String C_ACTION    = "action";  // turn action request
	public static final String C_SNAPSHOT  = "snapshot";// host sending world snapshot
	public static final String C_LEAVE     = "leave";   // leave current room

	// ─── Server -> Client message types ─────────────────────────────────────
	public static final String S_WELCOME     = "welcome"; // assigned player id
	public static final String S_ROOMINFO    = "roominfo";// room code + member list
	public static final String S_PLAYERJOIN  = "pjoin";   // a player entered the room
	public static final String S_PLAYERLEAVE = "pleave";  // a player left the room
	public static final String S_CHAT        = "chat";    // relayed chat line
	public static final String S_READY       = "s_ready"; // player ready state change
	public static final String S_COUNTDOWN   = "countdown"; // room start countdown tick
	public static final String S_STATE       = "state";   // authoritative room/game state
	public static final String S_SNAPSHOT    = "snapshot";// snapshot relayed to clients
	public static final String S_TURN_CHANGE  = "turn";    // active turn change & battle phase status
	public static final String S_HOST_PROMOTE= "promote"; // client promoted to host
	public static final String S_ERROR       = "error";   // human readable error
	public static final String S_GAME        = "game";    // opaque gameplay payload

	// Common field names.
	public static final String F_NAME     = "name";
	public static final String F_ID       = "id";
	public static final String F_CODE     = "code";
	public static final String F_MSG      = "msg";
	public static final String F_PLAYERS  = "players";
	public static final String F_READY    = "ready";
	public static final String F_HERO     = "hero";
	public static final String F_SECS     = "secs";
	public static final String F_DX       = "dx";
	public static final String F_DY       = "dy";
	public static final String F_CMD      = "cmd";
	public static final String F_DATA     = "data";
	public static final String F_HOST_ID  = "host_id";
	public static final String F_ACTIVE_ID= "active_id";
	public static final String F_BATTLE   = "battle";
	public static final String F_ACTION   = "action";
	public static final String F_SEED     = "seed";     // shared dungeon seed from host
	public static final String F_POS      = "pos";      // absolute cell position (spawn sync)
}
