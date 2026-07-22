/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Client side of the multiplayer layer. Connects to the dedicated server over
 * a plain TCP socket, frames messages with newline-delimited JSON, and exposes
 * a small callback interface so the UI can react to connection/server events.
 *
 * This is intentionally a thin transport prototype: it does not yet synchronise
 * the full Dungeon state. It establishes the connection, manages the room, and
 * relays chat/input so co-op gameplay can be layered on top later.
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer;

import com.watabou.noosa.Game;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

public class NetClient {

	public enum State { DISCONNECTED, CONNECTING, CONNECTED, IN_ROOM }

	public interface Listener {
		default void onStateChanged(State newState) {}
		default void onWelcome(int playerId) {}
		default void onRoomInfo(String code, List<NetPlayer> players) {}
		default void onPlayerJoin(NetPlayer player) {}
		default void onPlayerLeave(int playerId) {}
		default void onReadyChanged(int playerId, boolean ready, String heroClass) {}
		default void onCountdown(int seconds) {}
		default void onChat(int playerId, String name, String text) {}
		default void onHostPromote(int newHostId) {}
		default void onTurnChange(int activePlayerId, boolean battlePhase) {}
		default void onSnapshot(NetMessage data) {}
		default void onGame(NetMessage data) {}
		default void onSeed(long seed) {}  // host broadcasted dungeon seed
		default void onError(String message) {}
		default void onLog(String message) {}
	}

	private Socket socket;
	private BufferedReader in;
	private OutputStreamWriter out;

	private State state = State.DISCONNECTED;
	private int playerId = -1;
	private int hostId = -1;
	private String roomCode = null;
	private final List<NetPlayer> players = new ArrayList<>();

	private final List<Listener> listeners = new CopyOnWriteArrayList<>();
	private Thread readerThread;

	public static final NetClient INSTANCE = new NetClient();

	private NetClient() {}

	public void addListener(Listener l) {
		if (l != null && !listeners.contains(l)) listeners.add(l);
	}

	public void removeListener(Listener l) {
		listeners.remove(l);
	}

	public State getState() {
		return state;
	}

	public int getPlayerId() {
		return playerId;
	}

	public int getHostId() {
		return hostId;
	}

	public boolean isHost() {
		return playerId != -1 && hostId != -1 && playerId == hostId;
	}

	public String getRoomCode() {
		return roomCode;
	}

	public List<NetPlayer> getPlayers() {
		return new ArrayList<>(players);
	}

	// ─── Connection lifecycle ─────────────────────────────────────────────────

	public void connect(String host, int port, String playerName) {
		if (state != State.DISCONNECTED) disconnect();
		setState(State.CONNECTING);
		notifyLog("Connecting to " + host + ":" + port + " ...");

		new Thread(() -> {
			try {
				socket = new Socket(host, port);
				in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
				out = new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8);

				setState(State.CONNECTED);
				send(NetMessage.create(NetProtocol.C_HELLO).put(NetProtocol.F_NAME, playerName == null ? "Hero" : playerName));

				readerThread = new Thread(this::readLoop, "net-client-reader");
				readerThread.setDaemon(true);
				readerThread.start();
			} catch (IOException e) {
				notifyError("Connection failed: " + e.getMessage());
				setState(State.DISCONNECTED);
			}
		}, "net-client-connect").start();
	}

	public void disconnect() {
		setState(State.DISCONNECTED);
		roomCode = null;
		hostId = -1;
		playerId = -1;
		players.clear();
		try {
			if (socket != null) socket.close();
		} catch (IOException ignored) {}
		socket = null;
	}

	// ─── Outgoing commands ────────────────────────────────────────────────────

	public void createRoom() {
		send(NetMessage.create(NetProtocol.C_CREATE));
	}

	public void joinRoom(String code) {
		send(NetMessage.create(NetProtocol.C_JOIN).put(NetProtocol.F_CODE, code));
	}

	public void sendChat(String text) {
		send(NetMessage.create(NetProtocol.C_CHAT).put(NetProtocol.F_MSG, text));
	}

	public void sendReady(boolean ready, String heroClass) {
		send(NetMessage.create(NetProtocol.C_READY)
				.put(NetProtocol.F_READY, ready)
				.put(NetProtocol.F_HERO, heroClass == null ? "warrior" : heroClass));
	}

	public void sendHero(String heroClass) {
		send(NetMessage.create(NetProtocol.C_HERO)
				.put(NetProtocol.F_HERO, heroClass == null ? "warrior" : heroClass));
	}

	public void sendInput(int dx, int dy, String cmd) {
		send(NetMessage.create(NetProtocol.C_INPUT)
				.put(NetProtocol.F_DX, dx)
				.put(NetProtocol.F_DY, dy)
				.put(NetProtocol.F_CMD, cmd == null ? "" : cmd));
	}

	public void sendSnapshot(String payloadJson) {
		send(NetMessage.create(NetProtocol.C_SNAPSHOT).put(NetProtocol.F_DATA, payloadJson));
	}

	public void sendTurnChange(int activeId, boolean battlePhase) {
		send(NetMessage.create(NetProtocol.S_TURN_CHANGE)
				.put(NetProtocol.F_ACTIVE_ID, activeId)
				.put(NetProtocol.F_BATTLE, battlePhase));
	}

	/** Host sends the dungeon seed so all clients generate the same map. */
	public void sendSeed(long seed) {
		send(NetMessage.create(NetProtocol.C_INPUT)
				.put(NetProtocol.F_CMD, "seed")
				.put(NetProtocol.F_SEED, seed)
				.put(NetProtocol.F_DX, 0)
				.put(NetProtocol.F_DY, 0));
	}

	/** Broadcast absolute hero position so others see us on spawn. */
	public void sendPosition(int pos) {
		send(NetMessage.create(NetProtocol.C_INPUT)
				.put(NetProtocol.F_CMD, "pos")
				.put(NetProtocol.F_POS, pos)
				.put(NetProtocol.F_DX, 0)
				.put(NetProtocol.F_DY, 0));
	}

	/** Notify host that a client-side mob motion finished (reconciliation request). */
	public void sendMobComplete(int mobId, int pos) {
		send(NetMessage.create(NetProtocol.C_INPUT)
				.put(NetProtocol.F_CMD, "mob_mc")
				.put(NetProtocol.F_MOB_ID, mobId)
				.put(NetProtocol.F_POS, pos)
				.put(NetProtocol.F_DX, 0)
				.put(NetProtocol.F_DY, 0));
	}

	public void leaveRoom() {
		send(NetMessage.create(NetProtocol.C_LEAVE));
		roomCode = null;
		hostId = -1;
		players.clear();
	}

	// ─── Reader loop ──────────────────────────────────────────────────────────

	private void readLoop() {
		try {
			String line;
			while (socket != null && !socket.isClosed() && (line = in.readLine()) != null) {
				handle(line);
			}
		} catch (IOException ignored) {
			// socket closed
		} finally {
			if (state != State.DISCONNECTED) {
				notifyError("Disconnected from server.");
				setState(State.DISCONNECTED);
			}
		}
	}

	private void handle(String raw) {
		NetMessage m = NetMessage.parse(raw);
		String type = m.type();
		if (type == null) return;

		switch (type) {
			case NetProtocol.S_WELCOME:
				playerId = m.num(NetProtocol.F_ID);
				notifyWelcome(playerId);
				break;
			case NetProtocol.S_ROOMINFO:
				roomCode = m.str(NetProtocol.F_CODE);
				hostId = m.num(NetProtocol.F_HOST_ID);
				MpTurnManager.INSTANCE.setHostId(hostId);
				players.clear();
				for (Object o : m.list(NetProtocol.F_PLAYERS)) {
					if (o instanceof NetMessage) players.add(NetPlayer.fromMessage((NetMessage) o));
				}
				MpTurnManager.INSTANCE.setPlayerOrder(players);
				setState(State.IN_ROOM);
				notifyRoomInfo(roomCode, players);
				break;
			case NetProtocol.S_PLAYERJOIN:
				NetPlayer pj = NetPlayer.fromMessage(m);
				players.add(pj);
				MpTurnManager.INSTANCE.setPlayerOrder(players);
				notifyPlayerJoin(pj);
				break;
			case NetProtocol.S_PLAYERLEAVE:
				int pid = m.num(NetProtocol.F_ID);
				players.removeIf(p -> p.id == pid);
				MpTurnManager.INSTANCE.setPlayerOrder(players);
				notifyPlayerLeave(pid);
				break;
			case NetProtocol.S_HOST_PROMOTE:
				hostId = m.num(NetProtocol.F_HOST_ID);
				MpTurnManager.INSTANCE.setHostId(hostId);
				notifyHostPromote(hostId);
				break;
			case NetProtocol.S_TURN_CHANGE:
				int activeId = m.num(NetProtocol.F_ACTIVE_ID);
				boolean battle = m.bool(NetProtocol.F_BATTLE);
				MpTurnManager.INSTANCE.setActivePlayerId(activeId);
				MpTurnManager.INSTANCE.setBattlePhase(battle);
				notifyTurnChange(activeId, battle);
				break;
			case NetProtocol.S_SNAPSHOT:
				notifySnapshot(m);
				break;
			case NetProtocol.S_READY:
				int rPid = m.num(NetProtocol.F_ID);
				boolean rReady = m.bool(NetProtocol.F_READY);
				String rHero = m.str(NetProtocol.F_HERO);
				if (rHero == null) rHero = "warrior";
				for (NetPlayer p : players) {
					if (p.id == rPid) {
						p.ready = rReady;
						p.heroClass = rHero;
					}
				}
				notifyReadyChanged(rPid, rReady, rHero);
				break;
			case NetProtocol.S_COUNTDOWN:
				int secs = m.num(NetProtocol.F_SECS);
				notifyCountdown(secs);
				break;
			case NetProtocol.S_CHAT:
				notifyChat(m.num(NetProtocol.F_ID), m.str(NetProtocol.F_NAME), m.str(NetProtocol.F_MSG));
				break;
			case NetProtocol.S_GAME:
				notifyGame(m);
				break;
			case NetProtocol.S_ERROR:
				notifyError(m.str(NetProtocol.F_MSG));
				break;
			default:
				notifyLog("[server] " + raw);
		}
	}

	private void send(NetMessage m) {
		if (out == null || socket == null || socket.isClosed()) return;
		try {
			out.write(m.toJSON());
			out.write(NetProtocol.DELIMITER);
			out.flush();
		} catch (IOException e) {
			notifyError("Send failed: " + e.getMessage());
		}
	}

	private void setState(State s) {
		state = s;
		// ensure notification happens on the game thread where possible
		Game.runOnRenderThread(() -> {
			for (Listener l : listeners) l.onStateChanged(s);
		});
	}

	private void notifyWelcome(int id) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onWelcome(id); });
	}

	private void notifyRoomInfo(String code, List<NetPlayer> ps) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onRoomInfo(code, ps); });
	}

	private void notifyPlayerJoin(NetPlayer p) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onPlayerJoin(p); });
	}

	private void notifyPlayerLeave(int id) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onPlayerLeave(id); });
	}

	private void notifyReadyChanged(int id, boolean ready, String hero) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onReadyChanged(id, ready, hero); });
	}

	private void notifyCountdown(int secs) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onCountdown(secs); });
	}

	private void notifyHostPromote(int newHostId) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onHostPromote(newHostId); });
	}

	private void notifyTurnChange(int activeId, boolean battle) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onTurnChange(activeId, battle); });
	}

	private void notifySnapshot(NetMessage data) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onSnapshot(data); });
	}

	private void notifyChat(int id, String name, String text) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onChat(id, name, text); });
	}

	private void notifyGame(NetMessage data) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onGame(data); });
	}

	private void notifyError(String msg) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onError(msg); });
	}

	private void notifyLog(String msg) {
		Game.runOnRenderThread(() -> { for (Listener l : listeners) l.onLog(msg); });
	}
}
