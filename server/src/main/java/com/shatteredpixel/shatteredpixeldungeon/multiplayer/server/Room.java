/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Dedicated server: a single multiplayer room (lobby). The server is
 * authoritative for room membership and relays chat and gameplay input between
 * connected clients. Full game-state simulation is intentionally left out of
 * this prototype so the transport can be validated first.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer.server;

import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetMessage;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetPlayer;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetProtocol;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class Room {

	private final String code;
	private final List<ClientHandler> members = new CopyOnWriteArrayList<>();

	public Room(String code) {
		this.code = code;
	}

	public String getCode() {
		return code;
	}

	public List<ClientHandler> getMembers() {
		return members;
	}

	public boolean isEmpty() {
		return members.isEmpty();
	}

	public void add(ClientHandler c) {
		members.add(c);
	}

	public void remove(ClientHandler c) {
		members.remove(c);
	}

	// Relay a raw JSON line to every member except the sender.
	public void broadcast(String json, ClientHandler except) {
		for (ClientHandler c : members) {
			if (c != except) c.sendRaw(json);
		}
	}

	public void broadcast(String json) {
		broadcast(json, null);
	}

	public List<NetPlayer> snapshot() {
		List<NetPlayer> list = new ArrayList<>();
		for (ClientHandler c : members) list.add(c.asPlayer());
		return list;
	}

	public NetMessage roomInfoMessage() {
		NetMessage m = NetMessage.create(NetProtocol.S_ROOMINFO);
		m.put(NetProtocol.F_CODE, code);
		List<NetMessage> ps = new ArrayList<>();
		for (NetPlayer p : snapshot()) ps.add(p.toMessage());
		m.put(NetProtocol.F_PLAYERS, ps);
		return m;
	}

	public void sendPlayerListUpdate() {
		broadcast(roomInfoMessage().toJSON());
	}
}
