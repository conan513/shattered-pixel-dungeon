/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Per-connection handler running on its own thread. Reads newline-delimited
 * JSON from the socket, interprets client commands, and writes server replies.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer.server;

import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetMessage;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetPlayer;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetProtocol;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

public class ClientHandler implements Runnable {

	private final MultiplayerServer server;
	private final Socket socket;
	private final BufferedReader in;
	private final OutputStreamWriter out;

	private int playerId = -1;
	private String name = "Hero";
	private boolean ready = false;
	private String heroClass = "warrior";
	private Room room;

	private volatile boolean running = true;

	public ClientHandler(MultiplayerServer server, Socket socket) throws IOException {
		this.server = server;
		this.socket = socket;
		this.in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
		this.out = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);
	}

	public int getPlayerId() {
		return playerId;
	}

	public String getName() {
		return name;
	}

	public Room getRoom() {
		return room;
	}

	public NetPlayer asPlayer() {
		NetPlayer p = new NetPlayer(playerId, name);
		p.ready = ready;
		p.heroClass = heroClass;
		return p;
	}

	public void sendRaw(String json) {
		if (!running) return;
		try {
			out.write(json);
			out.write(NetProtocol.DELIMITER);
			out.flush();
		} catch (IOException e) {
			running = false;
		}
	}

	public void send(NetMessage m) {
		sendRaw(m.toJSON());
	}

	private void sendError(String msg) {
		send(NetMessage.create(NetProtocol.S_ERROR).put(NetProtocol.F_MSG, msg));
	}

	@Override
	public void run() {
		try {
			String line;
			while (running && (line = in.readLine()) != null) {
				handle(line);
			}
		} catch (IOException ignored) {
			// disconnect
		} finally {
			close();
		}
	}

	private void handle(String raw) {
		NetMessage m = NetMessage.parse(raw);
		String type = m.type();
		if (type == null) return;

		switch (type) {
			case NetProtocol.C_HELLO:
				name = clamp(m.str(NetProtocol.F_NAME), "Hero");
				playerId = server.nextPlayerId();
				send(NetMessage.create(NetProtocol.S_WELCOME).put(NetProtocol.F_ID, playerId));
				server.getLogger().info("Player " + playerId + " (" + name + ") connected");
				break;

			case NetProtocol.C_CREATE:
				if (room != null) leaveCurrentRoom();
				room = server.createRoom(this);
				room.sendPlayerListUpdate();
				break;

			case NetProtocol.C_JOIN:
				String code = m.str(NetProtocol.F_CODE);
				Room joined = server.joinRoom(this, code);
				if (joined == null) {
					sendError("Room not found: " + code);
				} else if (joined.isFull()) {
					sendError("Room is full (max " + Room.MAX_PLAYERS + " players)");
				} else {
					room = joined;
					room.sendPlayerListUpdate();
				}
				break;

			case NetProtocol.C_CHAT:
				if (room == null) break;
				NetMessage chat = NetMessage.create(NetProtocol.S_CHAT)
						.put(NetProtocol.F_ID, playerId)
						.put(NetProtocol.F_NAME, name)
						.put(NetProtocol.F_MSG, clamp(m.str(NetProtocol.F_MSG), ""));
				room.broadcast(chat.toJSON(), null);
				break;

			case NetProtocol.C_READY:
				if (room == null) break;
				ready = m.bool(NetProtocol.F_READY);
				if (m.str(NetProtocol.F_HERO) != null) heroClass = m.str(NetProtocol.F_HERO);
				room.updatePlayerReady(this, ready, heroClass);
				break;

			case NetProtocol.C_HERO:
				if (room == null) break;
				heroClass = m.str(NetProtocol.F_HERO);
				room.updatePlayerReady(this, ready, heroClass);
				break;

			case NetProtocol.C_INPUT:
				if (room == null) break;
				NetMessage relay = NetMessage.create(NetProtocol.S_GAME)
						.put(NetProtocol.F_ID, playerId)
						.put(NetProtocol.F_NAME, name)
						.put(NetProtocol.F_DX, m.num(NetProtocol.F_DX))
						.put(NetProtocol.F_DY, m.num(NetProtocol.F_DY))
						.put(NetProtocol.F_CMD, m.str(NetProtocol.F_CMD));
				if (m.containsKey(NetProtocol.F_SEED)) relay.put(NetProtocol.F_SEED, m.get(NetProtocol.F_SEED));
				if (m.containsKey(NetProtocol.F_POS))  relay.put(NetProtocol.F_POS,  m.get(NetProtocol.F_POS));
				room.broadcast(relay.toJSON(), this);
				break;

			case NetProtocol.C_SNAPSHOT:
				if (room == null) break;
				// Relay snapshot payload to all other clients in the room
				NetMessage snapMsg = NetMessage.create(NetProtocol.S_SNAPSHOT)
						.put(NetProtocol.F_HOST_ID, playerId)
						.put(NetProtocol.F_DATA, m.get(NetProtocol.F_DATA));
				room.broadcast(snapMsg.toJSON(), this);
				break;

			case NetProtocol.C_ACTION:
				if (room == null) break;
				NetMessage actMsg = NetMessage.create(NetProtocol.C_ACTION)
						.put(NetProtocol.F_ID, playerId)
						.put(NetProtocol.F_ACTION, m.str(NetProtocol.F_ACTION))
						.put(NetProtocol.F_DX, m.num(NetProtocol.F_DX))
						.put(NetProtocol.F_DY, m.num(NetProtocol.F_DY));
				room.broadcast(actMsg.toJSON(), this);
				break;

			case NetProtocol.C_LEAVE:
				leaveCurrentRoom();
				break;

			default:
				sendError("Unknown command: " + type);
		}
	}

	private void leaveCurrentRoom() {
		if (room != null) {
			room.remove(this);
			room.broadcast(NetMessage.create(NetProtocol.S_PLAYERLEAVE)
					.put(NetProtocol.F_ID, playerId).toJSON());
			room.sendPlayerListUpdate();
			room = null;
		}
	}

	public void disconnect() {
		if (socket != null) {
			try { socket.close(); } catch (IOException ignored) {}
		}
	}

	private void close() {
		running = false;
		leaveCurrentRoom();
		server.onDisconnect(this);
		try { socket.close(); } catch (IOException ignored) {}
		server.getLogger().info("Player " + playerId + " (" + name + ") disconnected");
	}

	private String clamp(String s, String fallback) {
		if (s == null) return fallback;
		s = s.trim();
		if (s.isEmpty()) return fallback;
		return s.length() > 24 ? s.substring(0, 24) : s;
	}
}
