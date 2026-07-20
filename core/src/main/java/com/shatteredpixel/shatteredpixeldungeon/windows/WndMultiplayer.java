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
import com.shatteredpixel.shatteredpixeldungeon.scenes.PixelScene;
import com.shatteredpixel.shatteredpixeldungeon.ui.RedButton;
import com.shatteredpixel.shatteredpixeldungeon.ui.RenderedTextBlock;
import com.shatteredpixel.shatteredpixeldungeon.ui.Window;
import com.watabou.noosa.TextInput;

import java.util.List;

public class WndMultiplayer extends Window {

	private static final int WIDTH = 210;
	private static final int MARGIN = 2;
	private static final int BUTTON_HEIGHT = 16;

	private final NetClient client = NetClient.INSTANCE;
	private final NetClient.Listener listener = new NetClient.Listener() {
		@Override
		public void onStateChanged(NetClient.State s) { refresh(); }

		@Override
		public void onRoomInfo(String code, List<NetPlayer> players) { refresh(); }

		@Override
		public void onPlayerJoin(NetPlayer p) { refresh(); }

		@Override
		public void onPlayerLeave(int id) { refresh(); }

		@Override
		public void onChat(int id, String name, String text) { appendChat(name, text); }

		@Override
		public void onError(String msg) { setStatus(Messages.get(this, "error", msg)); }
	};

	private RenderedTextBlock statusTxt;
	private TextInput nameBox;
	private RedButton btnHost, btnJoin, btnLeave, btnSend;
	private RenderedTextBlock playerList;
	private RenderedTextBlock chatLog;

	private final StringBuilder chatHistory = new StringBuilder();

	public WndMultiplayer() {
		super();

		client.addListener(listener);

		float pos = MARGIN;

		RenderedTextBlock title = PixelScene.renderTextBlock(Messages.get(this, "title"), 9);
		title.hardlight(TITLE_COLOR);
		title.setPos((WIDTH - title.width()) / 2, pos);
		add(title);
		pos = title.bottom() + 4;

		// ── Name field (only TextInput in this window) ──
		RenderedTextBlock nameLabel = PixelScene.renderTextBlock(Messages.get(this, "name"), 6);
		nameLabel.maxWidth(WIDTH - 2 * MARGIN);
		add(nameLabel);
		nameLabel.setPos(MARGIN, pos);
		pos = nameLabel.bottom() + MARGIN;

		nameBox = new TextInput(Chrome.get(Chrome.Type.TOAST_WHITE), false, 9);
		nameBox.setMaxLength(24);
		nameBox.setText("Hero");
		add(nameBox);
		nameBox.setRect(MARGIN, pos, WIDTH - 2 * MARGIN, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Host button ──
		btnHost = new RedButton(Messages.get(this, "create")) {
			@Override
			protected void onClick() {
				client.connect(NetProtocol.DEFAULT_HOST, NetProtocol.DEFAULT_PORT, nameBox.getText().trim());
				client.createRoom();
			}
		};
		add(btnHost);
		btnHost.setRect(MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);

		// ── Join button (opens code dialog) ──
		btnJoin = new RedButton(Messages.get(this, "join")) {
			@Override
			protected void onClick() {
				openJoinDialog();
			}
		};
		add(btnJoin);
		btnJoin.setRect(btnHost.right() + MARGIN, pos, (WIDTH - 2 * MARGIN - MARGIN) / 2f, BUTTON_HEIGHT);
		pos += BUTTON_HEIGHT + MARGIN;

		// ── Leave ──
		btnLeave = new RedButton(Messages.get(this, "leave")) {
			@Override
			protected void onClick() {
				client.leaveRoom();
			}
		};
		add(btnLeave);
		btnLeave.setRect(MARGIN, pos, WIDTH - 2 * MARGIN, BUTTON_HEIGHT);
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
		btnSend = new RedButton(Messages.get(this, "chat_hint")) {
			@Override
			protected void onClick() {
				ShatteredPixelDungeon.scene().addToFront(new WndTextInput(
						"", Messages.get(WndMultiplayer.class, "chat_hint"),
						"", 120, false,
						Messages.get(this, "join"), null) {
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
		statusTxt = PixelScene.renderTextBlock("", 6);
		statusTxt.maxWidth(WIDTH - 2 * MARGIN);
		statusTxt.hardlight(0x888888);
		add(statusTxt);
		statusTxt.setPos(MARGIN, pos);
		pos = statusTxt.bottom() + MARGIN;

		resize(WIDTH, (int) pos);

		// Automatically connect to the fixed lobby server on open.
		setStatus(Messages.get(this, "connecting"));
		client.connect(NetProtocol.DEFAULT_HOST, NetProtocol.DEFAULT_PORT, nameBox.getText().trim());
		refresh();
	}

	private void openJoinDialog() {
		ShatteredPixelDungeon.scene().addToFront(new WndTextInput(
				"", Messages.get(WndMultiplayer.class, "room_code"),
				"", 8, false,
				Messages.get(this, "join"), Messages.get(this, "leave")) {
			@Override
			public void onSelect(boolean positive, String text) {
				if (positive && text != null && !text.trim().isEmpty()) {
					client.connect(NetProtocol.DEFAULT_HOST, NetProtocol.DEFAULT_PORT, nameBox.getText().trim());
					client.joinRoom(text.trim().toUpperCase());
				}
			}
		});
	}

	private void appendChat(String name, String text) {
		chatHistory.append(name).append(": ").append(text).append("\n");
		String[] lines = chatHistory.toString().split("\n");
		int start = Math.max(0, lines.length - 6);
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

		nameBox.active = offline;
		btnHost.enable(connected || inRoom);
		btnJoin.enable(connected || inRoom);
		btnLeave.enable(inRoom);
		btnSend.enable(inRoom);

		if (offline) {
			setStatus(Messages.get(this, "ui_offline"));
			playerList.text("");
		} else if (connected) {
			setStatus(Messages.get(this, "connected"));
			playerList.text("");
		} else if (inRoom) {
			setStatus(Messages.get(this, "ui_in_room", client.getRoomCode()));
			StringBuilder sb = new StringBuilder(Messages.get(this, "players")).append("\n");
			for (NetPlayer p : client.getPlayers()) {
				sb.append("- ").append(p.name)
						.append(p.id == client.getPlayerId() ? " (you)" : "").append("\n");
			}
			playerList.text(sb.toString());
		}

		if (inRoom && client.getPlayers().size() < 2) {
			setStatus(Messages.get(this, "waiting_for_partner"));
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
