/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Dedicated multiplayer server entry point. Listens on a TCP port, accepts
 * client connections, and routes them into rooms. Build with the server module
 * and run:
 *
 *   gradlew :server:run   (or java -jar server.jar)
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer.server;

import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetProtocol;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class MultiplayerServer {

	private final int port;
	private final Map<String, Room> rooms = new ConcurrentHashMap<>();
	private final AtomicInteger playerIdSeq = new AtomicInteger(1);
	private final Logger logger;

	private ServerSocket serverSocket;
	private Thread acceptThread;
	private volatile boolean running;

	public interface Logger {
		void info(String msg);
		void warn(String msg);
		void error(String msg);
	}

	public MultiplayerServer(int port) {
		this(port, new Logger() {
			@Override public void info(String m) { System.out.println("[server] " + m); }
			@Override public void warn(String m) { System.out.println("[server|WARN] " + m); }
			@Override public void error(String m) { System.err.println("[server|ERR] " + m); }
		});
	}

	public MultiplayerServer(int port, Logger logger) {
		this.port = port;
		this.logger = logger != null ? logger : new Logger() {
			@Override public void info(String m) { System.out.println("[server] " + m); }
			@Override public void warn(String m) { System.out.println("[server|WARN] " + m); }
			@Override public void error(String m) { System.err.println("[server|ERR] " + m); }
		};
	}

	public Logger getLogger() {
		return logger;
	}

	public int nextPlayerId() {
		return playerIdSeq.getAndIncrement();
	}

	public void start() throws IOException {
		serverSocket = new ServerSocket(port);
		running = true;
		logger.info("Shattered Pixel Dungeon multiplayer server listening on port " + port);
		acceptThread = new Thread(this::acceptLoop, "net-server-accept");
		acceptThread.setDaemon(true);
		acceptThread.start();
	}

	public void stop() {
		running = false;
		try { if (serverSocket != null) serverSocket.close(); } catch (IOException ignored) {}
		for (Room r : rooms.values()) r.getMembers().forEach(ClientHandler::disconnect);
		rooms.clear();
	}

	private void acceptLoop() {
		while (running) {
			try {
				Socket socket = serverSocket.accept();
				ClientHandler handler = new ClientHandler(this, socket);
				Thread t = new Thread(handler, "net-client-" + socket.getInetAddress());
				t.setDaemon(true);
				t.start();
			} catch (IOException e) {
				if (running) logger.error("Accept error: " + e.getMessage());
			}
		}
	}

	public synchronized Room createRoom(ClientHandler owner) {
		String code;
		do {
			code = generateCode();
		} while (rooms.containsKey(code));
		Room room = new Room(code);
		rooms.put(code, room);
		room.add(owner);
		logger.info("Room " + code + " created by player " + owner.getPlayerId());
		return room;
	}

	public synchronized Room joinRoom(ClientHandler client, String code) {
		if (code == null) return null;
		Room room = rooms.get(code.trim().toUpperCase());
		if (room == null) return null;
		if (!room.getMembers().contains(client)) {
			room.add(client);
			logger.info("Player " + client.getPlayerId() + " joined room " + code);
		}
		return room;
	}

	public synchronized void onDisconnect(ClientHandler client) {
		Room room = client.getRoom();
		if (room != null) {
			room.remove(client);
			if (room.isEmpty()) {
				rooms.remove(room.getCode());
				logger.info("Room " + room.getCode() + " closed (empty)");
			}
		}
	}

	private String generateCode() {
		final String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		StringBuilder sb = new StringBuilder();
		for (int i = 0; i < 5; i++) {
			sb.append(alphabet.charAt((int) (Math.random() * alphabet.length())));
		}
		return sb.toString();
	}

	public static void main(String[] args) {
		int port = NetProtocol.DEFAULT_PORT;
		if (args.length > 0) {
			try { port = Integer.parseInt(args[0]); } catch (NumberFormatException e) {
				System.err.println("Invalid port: " + args[0] + ", using default " + port);
			}
		}
		try {
			MultiplayerServer server = new MultiplayerServer(port);
			server.start();
			Runtime.getRuntime().addShutdownHook(new Thread(server::stop));
			System.out.println("Press Ctrl+C to stop.");
			// Keep the main (non-daemon) thread alive. The accept loop runs on
			// daemon threads, so without this the JVM would exit immediately.
			Thread mainThread = Thread.currentThread();
			Runtime.getRuntime().addShutdownHook(new Thread(() -> {
				try { mainThread.join(); } catch (InterruptedException ignored) {}
			}));
			// Block until interrupted (Ctrl+C triggers the shutdown hook).
			try {
				Thread.sleep(Long.MAX_VALUE);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		} catch (IOException e) {
			System.err.println("Failed to start server: " + e.getMessage());
			System.exit(1);
		}
	}
}
