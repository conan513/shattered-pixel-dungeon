/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Lightweight snapshot of a remote player inside a multiplayer room. The
 * dedicated server is authoritative; clients only mirror this data.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer;

public class NetPlayer {

	public int id;
	public String name;
	public boolean ready;
	public int depth;
	public int hp;
	public int maxHp;

	public NetPlayer() {}

	public NetPlayer(int id, String name) {
		this.id = id;
		this.name = name;
	}

	public static NetPlayer fromMessage(NetMessage m) {
		NetPlayer p = new NetPlayer();
		p.id = m.num(NetProtocol.F_ID);
		p.name = m.str(NetProtocol.F_NAME);
		p.ready = m.bool("ready");
		p.depth = m.num("depth");
		p.hp = m.num("hp");
		p.maxHp = m.num("maxHp");
		return p;
	}

	public NetMessage toMessage() {
		return NetMessage.create("player")
				.put(NetProtocol.F_ID, id)
				.put(NetProtocol.F_NAME, name == null ? "" : name)
				.put("ready", ready)
				.put("depth", depth)
				.put("hp", hp)
				.put("maxHp", maxHp);
	}
}
