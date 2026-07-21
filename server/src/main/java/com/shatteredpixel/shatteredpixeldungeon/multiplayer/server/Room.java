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

	public static final int MAX_PLAYERS = 8;

	private final String code;
	private final List<ClientHandler> members = new CopyOnWriteArrayList<>();
	private Thread countdownThread;

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

	public boolean isFull() {
		return members.size() >= MAX_PLAYERS;
	}

	public synchronized ClientHandler getHost() {
		return members.isEmpty() ? null : members.get(0);
	}

	public synchronized int getHostId() {
		ClientHandler h = getHost();
		return h != null ? h.getPlayerId() : -1;
	}

	public synchronized void add(ClientHandler c) {
		if (members.size() < MAX_PLAYERS) {
			members.add(c);
		}
	}

	public synchronized void remove(ClientHandler c) {
		boolean wasHost = (!members.isEmpty() && members.get(0) == c);
		members.remove(c);
		cancelCountdown();

		if (wasHost && !members.isEmpty()) {
			ClientHandler newHost = members.get(0);
			NetMessage promote = NetMessage.create(NetProtocol.S_HOST_PROMOTE)
					.put(NetProtocol.F_HOST_ID, newHost.getPlayerId());
			broadcast(promote.toJSON());
		}
	}

	public synchronized void updatePlayerReady(ClientHandler player, boolean ready, String heroClass) {
		broadcast(NetMessage.create(NetProtocol.S_READY)
				.put(NetProtocol.F_ID, player.getPlayerId())
				.put(NetProtocol.F_READY, ready)
				.put(NetProtocol.F_HERO, heroClass).toJSON());
		checkCountdown();
	}

	private synchronized void checkCountdown() {
		boolean allReady = !members.isEmpty();
		for (ClientHandler c : members) {
			if (!c.asPlayer().ready) {
				allReady = false;
				break;
			}
		}

		if (allReady && countdownThread == null) {
			startCountdown();
		} else if (!allReady && countdownThread != null) {
			cancelCountdown();
		}
	}

	private synchronized void startCountdown() {
		cancelCountdown();
		countdownThread = new Thread(() -> {
			try {
				for (int i = 5; i >= 0; i--) {
					broadcast(NetMessage.create(NetProtocol.S_COUNTDOWN)
							.put(NetProtocol.F_SECS, i).toJSON());
					if (i > 0) Thread.sleep(1000);
				}
			} catch (InterruptedException ignored) {
				broadcast(NetMessage.create(NetProtocol.S_COUNTDOWN)
						.put(NetProtocol.F_SECS, -1).toJSON());
			} finally {
				synchronized (Room.this) {
					countdownThread = null;
				}
			}
		}, "room-countdown-" + code);
		countdownThread.start();
	}

	private synchronized void cancelCountdown() {
		if (countdownThread != null) {
			countdownThread.interrupt();
			countdownThread = null;
		}
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
		m.put(NetProtocol.F_HOST_ID, getHostId());
		List<NetMessage> ps = new ArrayList<>();
		for (NetPlayer p : snapshot()) ps.add(p.toMessage());
		m.put(NetProtocol.F_PLAYERS, ps);
		return m;
	}

	public void sendPlayerListUpdate() {
		broadcast(roomInfoMessage().toJSON());
	}
}
