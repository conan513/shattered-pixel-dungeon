/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Multiplayer lobby window. The client automatically connects to the fixed
 * lobby server on open. The player enters a display name, then either hosts a
 * new room or joins one with a code. To keep libGDX TextInput focus handling
 * reliable this window uses exactly ONE TextInput (the name field); the room
 * code and chat are entered through separate WndTextInput dialogs.
 */

package com.shatteredpixel.shatteredpixeldungeon.windows;

import com.shatteredpixel.shatteredpixeldungeon.Chrome;
import com.shatteredpixel.shatteredpixeldungeon.ShatteredPixelDungeon;
import com.shatteredpixel.shatteredpixeldungeon.messages.Messages;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetClient;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetPlayer;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetProtocol;
import com.shatteredpixel.shatteredpixeldungeon.scenes.HeroSelectScene;
import com.shatteredpixel.shatteredpixeldungeon.scenes.PixelScene;
import com.shatteredpixel.shatteredpixeldungeon.ui.RedButton;
import com.shatteredpixel.shatteredpixeldungeon.ui.RenderedTextBlock;
import com.shatteredpixel.shatteredpixeldungeon.ui.Window;
import com.watabou.noosa.Game;
import com.watabou.noosa.TextInput;

import java.util.List;

public class WndMultiplayer extends Window {

	private static final int WIDTH = 210;
	private static final int MARGIN = 2;
	private static final int BUTTON_HEIGHT = 16;

	private final NetClient client = NetClient.INSTANCE;

	private RenderedTextBlock statusTxt;
	private TextInput nameBox;
	private RedButton btnHost, btnJoin, btnLeave, btnReady, btnSend;
	private RenderedTextBlock playerList;
	private RenderedTextBlock chatLog;

	private boolean isLocalReady = false;
	private final StringBuilder chatHistory = new StringBuilder();

	// Holds the action (createRoom or joinRoom+code) to run once server sends S_WELCOME.
	// This is necessary because connect() is asynchronous — we cannot call createRoom()
	// immediately after connect(); the socket is not open yet.
	private Runnable pendingRoomAction = null;

	private final NetClient.Listener listener = new NetClient.Listener() {
		@Override
		public void onStateChanged(NetClient.State s) { refresh(); }

		@Override
		public void onWelcome(int playerId) {
			// Socket is now open and server acknowledged us — safe to create/join a room.
			if (pendingRoomAction != null) {
				pendingRoomAction.run();
				pendingRoomAction = null;
			}
		}

		@Override
		public void onRoomInfo(String code, List<NetPlayer> players) {
			// Room confirmed by server — close this lobby menu and switch to the
			// hero selection screen.  HeroSelectScene.create() will detect that
			// NetClient is IN_ROOM and open WndMultiplayerLobby as an overlay.
			client.removeListener(listener);
			Game.switchScene(HeroSelectScene.class);
		}

		@Override
		public void onPlayerJoin(NetPlayer p) { refresh(); }

		@Override
		public void onPlayerLeave(int id) { refresh(); }

		@Override
		public void onReadyChanged(int id, boolean ready, String heroClass) { refresh(); }

		@Override
		public void onCountdown(int seconds) {
			if (seconds > 0) {
				setStatus("Game starting in " + seconds + "...");
			} else if (seconds == 0) {
				setStatus("Starting game!");
			} else {
				setStatus("Countdown cancelled.");
			}
		}

		@Override
		public void onChat(int id, String name, String text) { appendChat(name, text); }

		@Override
		public void onError(String msg) { setStatus(msg == null ? "Error occurred." : msg); }
	};

	public WndMultiplayer() {
		super();

		client.addListener(listener);

		float pos = MARGIN;

		RenderedTextBlock title = PixelScene.renderTextBlock("MULTIPLAYER LOBBY", 9);
		title.hardlight(TITLE_COLOR);
		title.setPos((WIDTH - title.width()) / 2, pos);
		add(title);
		pos = title.bottom() + 4;

		// ── Name field (only TextInput in this window) ──
		RenderedTextBlock nameLabel = PixelScene.renderTextBlock("Your Hero Name:", 6);
		nameLabel.maxWidth(WIDTH - 2 * MARGIN);
		add(nameLabel);
		nameLabel.setPos(MARGIN, pos);
		pos = nameLabel.bottom() + MARGIN;

		// Scale font size by camera zoom so text is readable at all zoom levels
		int nameInputSize = (int) PixelScene.uiCamera.zoom * 9;
		nameBox = new TextInput(Chrome.get(Chrome.Type.TOAST_WHITE), false, nameInputSize);
		nameBox.setMaxLength(24);
		nameBox.setText("Hero");
		add(nameBox);
		nameBox.setRect(MARGIN, pos, WIDTH - 2 * MARGIN, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Host button ──
		btnHost = new RedButton("HOST GAME") {
			@Override
			protected void onClick() {
				setStatus("Connecting to server...");
				// Set action to run once server confirms connection (onWelcome)
				pendingRoomAction = () -> client.createRoom();
				client.connect(NetProtocol.DEFAULT_HOST, NetProtocol.DEFAULT_PORT, nameBox.getText().trim());
			}
		};
		add(btnHost);
		btnHost.setRect(MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);

		// ── Join button (opens code dialog) ──
		btnJoin = new RedButton("JOIN GAME") {
			@Override
			protected void onClick() {
				openJoinDialog();
			}
		};
		add(btnJoin);
		btnJoin.setRect(btnHost.right() + MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Ready button ──
		btnReady = new RedButton("READY") {
			@Override
			protected void onClick() {
				isLocalReady = !isLocalReady;
				text(isLocalReady ? "UNREADY" : "READY");
				client.sendReady(isLocalReady, "warrior");
			}
		};
		add(btnReady);
		btnReady.setRect(MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);

		// ── Leave button ──
		btnLeave = new RedButton("LEAVE ROOM") {
			@Override
			protected void onClick() {
				isLocalReady = false;
				btnReady.text("READY");
				client.leaveRoom();
			}
		};
		add(btnLeave);
		btnLeave.setRect(btnReady.right() + MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Player list ──
		playerList = PixelScene.renderTextBlock("", 6);
		playerList.maxWidth(WIDTH - 2 * MARGIN);
		add(playerList);
		playerList.setPos(MARGIN, pos);
		pos = playerList.bottom() + MARGIN;

		// ── Chat log ──
		chatLog = PixelScene.renderTextBlock("", 6);
		chatLog.maxWidth(WIDTH - 2 * MARGIN);
		add(chatLog);
		chatLog.setPos(MARGIN, pos);
		pos = chatLog.bottom() + MARGIN;

		// ── Send chat (opens WndTextInput) ──
		btnSend = new RedButton("CHAT") {
			@Override
			protected void onClick() {
				ShatteredPixelDungeon.scene().addToFront(new WndTextInput(
						"", "Enter chat message:",
						"", 120, false,
						"SEND", "CANCEL") {
					@Override
					public void onSelect(boolean positive, String text) {
						if (positive && text != null && !text.trim().isEmpty()) {
							client.sendChat(text.trim());
						}
					}
				});
			}
		};
		add(btnSend);
		btnSend.setRect(MARGIN, pos, WIDTH - 2 * MARGIN, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Status line ──
		statusTxt = PixelScene.renderTextBlock("Enter name, then click Host or Join.", 6);
		statusTxt.maxWidth(WIDTH - 2 * MARGIN);
		statusTxt.hardlight(0x888888);
		add(statusTxt);
		statusTxt.setPos(MARGIN, pos);
		pos = statusTxt.bottom() + MARGIN;

		// ── resize() must come first, then re-apply nameBox rect so the
		//    libGDX Stage positions the text field correctly (same fix as WndTextInput) ──
		resize(WIDTH, (int) pos);
		nameBox.setRect(nameBox.left(), nameBox.top(), nameBox.width(), nameBox.height());
		refresh();
	}

	private void openJoinDialog() {
		ShatteredPixelDungeon.scene().addToFront(new WndTextInput(
				"", "Enter 6-letter Room Code:",
				"", 8, false,
				"CONNECT", "CANCEL") {
			@Override
			public void onSelect(boolean positive, String text) {
				if (positive && text != null && !text.trim().isEmpty()) {
					final String code = text.trim().toUpperCase();
					setStatus("Connecting to server...");
					// Set action to run once server confirms connection (onWelcome)
					pendingRoomAction = () -> client.joinRoom(code);
					client.connect(NetProtocol.DEFAULT_HOST, NetProtocol.DEFAULT_PORT, nameBox.getText().trim());
				}
			}
		});
	}

	private void appendChat(String name, String text) {
		chatHistory.append(name).append(": ").append(text).append("\n");
		String[] lines = chatHistory.toString().split("\n");
		int start = Math.max(0, lines.length - 5);
		StringBuilder visible = new StringBuilder();
		for (int i = start; i < lines.length; i++) visible.append(lines[i]).append("\n");
		chatLog.text(visible.toString());
		chatLog.setPos(chatLog.left(), chatLog.top());
	}

	private void setStatus(String msg) {
		if (statusTxt != null) {
			statusTxt.text(msg);
			statusTxt.setPos(statusTxt.left(), statusTxt.top());
		}
	}

	private void refresh() {
		if (statusTxt == null) return;
		NetClient.State s = client.getState();

		boolean offline = s == NetClient.State.DISCONNECTED;
		boolean connected = s == NetClient.State.CONNECTED;
		boolean inRoom = s == NetClient.State.IN_ROOM;

		nameBox.active = !inRoom;
		btnHost.enable(!inRoom);
		btnJoin.enable(!inRoom);
		btnReady.enable(inRoom);
		btnLeave.enable(inRoom);
		btnSend.enable(inRoom);

		if (offline) {
			setStatus("Offline. Enter name, then Host or Join.");
			playerList.text("");
		} else if (connected && !inRoom) {
			setStatus("Connected to server. Creating/Joining room...");
			playerList.text("");
		} else if (inRoom) {
			setStatus("Room: " + client.getRoomCode());
			StringBuilder sb = new StringBuilder("PLAYERS:\n");
			for (NetPlayer p : client.getPlayers()) {
				sb.append("- ").append(p.name)
						.append(p.id == client.getPlayerId() ? " (you)" : "")
						.append(p.ready ? " [READY]" : " [NOT READY]")
						.append("\n");
			}
			playerList.text(sb.toString());
		}

		playerList.setPos(playerList.left(), playerList.top());
		statusTxt.setPos(statusTxt.left(), statusTxt.top());
	}

	@Override
	public void onBackPressed() {
		hide();
	}

	@Override
	public void hide() {
		client.removeListener(listener);
		super.hide();
	}
}
