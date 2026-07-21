/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * Multiplayer room overlay, shown on top of HeroSelectScene after the host
 * creates (or a guest joins) a room.  Contains the player list, ready toggle,
 * chat log, and a chat-send button.  When all players are ready the server
 * sends a countdown; at 0 the scene transitions to the game.
 */

package com.shatteredpixel.shatteredpixeldungeon.windows;

import com.shatteredpixel.shatteredpixeldungeon.Chrome;
import com.shatteredpixel.shatteredpixeldungeon.ShatteredPixelDungeon;
import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetClient;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetPlayer;
import com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetProtocol;
import com.shatteredpixel.shatteredpixeldungeon.scenes.InterlevelScene;
import com.shatteredpixel.shatteredpixeldungeon.scenes.PixelScene;
import com.shatteredpixel.shatteredpixeldungeon.ui.RedButton;
import com.shatteredpixel.shatteredpixeldungeon.ui.RenderedTextBlock;
import com.shatteredpixel.shatteredpixeldungeon.ui.Window;
import com.shatteredpixel.shatteredpixeldungeon.utils.DungeonSeed;
import com.watabou.noosa.Game;

import java.util.List;

public class WndMultiplayerLobby extends Window {

    private static final int WIDTH   = 130;
    private static final int MARGIN  = 4;
    private static final int BTN_H   = 16;

    private final NetClient client = NetClient.INSTANCE;

    private RenderedTextBlock titleTxt;
    private RenderedTextBlock playersTxt;
    private RenderedTextBlock chatTxt;
    private RedButton btnReady;
    private RedButton btnChat;
    private RedButton btnLeave;

    private boolean isReady = false;
    private final StringBuilder chatHistory = new StringBuilder();

    // ── NetClient callbacks ──────────────────────────────────────────────────

    private final NetClient.Listener listener = new NetClient.Listener() {

        @Override
        public void onStateChanged(NetClient.State s) {
            if (s == NetClient.State.DISCONNECTED) {
                hide();
            }
        }

        @Override
        public void onRoomInfo(String code, List<NetPlayer> players) { refresh(); }

        @Override
        public void onPlayerJoin(NetPlayer p) { refresh(); }

        @Override
        public void onPlayerLeave(int id) { refresh(); }

        @Override
        public void onReadyChanged(int id, boolean ready, String heroClass) { refresh(); }

        @Override
        public void onCountdown(int seconds) {
            if (seconds > 0) {
                // Host generates a NEW random seed on countdown start and broadcasts on every tick
                if (NetClient.INSTANCE.isHost()) {
                    if (seconds == 5 || Dungeon.seed == 0) {
                        Dungeon.daily = Dungeon.dailyReplay = false;
                        Dungeon.customSeedText = "";
                        Dungeon.seed = DungeonSeed.randomSeed();
                    }
                    NetClient.INSTANCE.sendSeed(Dungeon.seed);
                }
                setTitle("READY – Starting in " + seconds + "s");
            } else if (seconds == 0) {
                // Server says go – transition to the game
                hide();
                InterlevelScene.mode = InterlevelScene.Mode.DESCEND;
                Game.switchScene(InterlevelScene.class);
            } else {
                // Countdown cancelled
                setTitle("LOBBY – " + client.getRoomCode());
            }
        }

        @Override
        public void onGame(com.shatteredpixel.shatteredpixeldungeon.multiplayer.NetMessage data) {
            // Receive the host-broadcasted seed so all clients generate the same map
            if ("seed".equals(data.str(NetProtocol.F_CMD))) {
                long hostSeed = data.longNum(NetProtocol.F_SEED);
                if (hostSeed != 0 && !NetClient.INSTANCE.isHost()) {
                    Dungeon.daily = Dungeon.dailyReplay = false;
                    Dungeon.customSeedText = "";
                    Dungeon.seed = hostSeed;
                }
            }
        }

        @Override
        public void onChat(int id, String name, String text) { appendChat(name, text); }

        @Override
        public void onError(String msg) { setTitle("ERROR: " + (msg != null ? msg : "?")); }
    };

    // ── Constructor ──────────────────────────────────────────────────────────

    public WndMultiplayerLobby() {
        super();

        client.addListener(listener);

        float pos = MARGIN;

        // Title
        titleTxt = PixelScene.renderTextBlock("LOBBY – " + client.getRoomCode(), 7);
        titleTxt.hardlight(TITLE_COLOR);
        add(titleTxt);
        pos = titleTxt.bottom() + MARGIN;

        // Player list
        playersTxt = PixelScene.renderTextBlock("", 6);
        playersTxt.maxWidth(WIDTH - 2 * MARGIN);
        add(playersTxt);
        playersTxt.setPos(MARGIN, pos);
        pos = playersTxt.bottom() + MARGIN;

        // Chat log (last 4 lines)
        chatTxt = PixelScene.renderTextBlock("", 6);
        chatTxt.maxWidth(WIDTH - 2 * MARGIN);
        add(chatTxt);
        chatTxt.setPos(MARGIN, pos);
        pos = chatTxt.bottom() + MARGIN;

        // Ready button
        btnReady = new RedButton("READY") {
            @Override
            protected void onClick() {
                isReady = !isReady;
                text(isReady ? "UNREADY" : "READY");
                // Report the currently-selected hero class
                String heroClass = com.shatteredpixel.shatteredpixeldungeon.GamesInProgress.selectedClass != null
                        ? com.shatteredpixel.shatteredpixeldungeon.GamesInProgress.selectedClass.name().toLowerCase()
                        : "warrior";
                client.sendReady(isReady, heroClass);
            }
        };
        add(btnReady);
        btnReady.setRect(MARGIN, pos, (WIDTH - 3 * MARGIN) / 2f, BTN_H);

        // Leave button
        btnLeave = new RedButton("LEAVE") {
            @Override
            protected void onClick() {
                client.leaveRoom();
                hide();
            }
        };
        add(btnLeave);
        btnLeave.setRect(btnReady.right() + MARGIN, pos, (WIDTH - 3 * MARGIN) / 2f, BTN_H);
        pos += BTN_H + MARGIN;

        // Chat button
        btnChat = new RedButton("CHAT") {
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
        add(btnChat);
        btnChat.setRect(MARGIN, pos, WIDTH - 2 * MARGIN, BTN_H);
        pos += BTN_H + MARGIN;

        resize(WIDTH, (int) pos);
        refresh();

        // Position overlay in the top-left area of the screen (over HeroSelectScene UI)
        offset(4, 4);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void setTitle(String t) {
        titleTxt.text(t);
        titleTxt.setPos(titleTxt.left(), titleTxt.top());
    }

    private void appendChat(String name, String text) {
        chatHistory.append(name).append(": ").append(text).append("\n");
        String[] lines = chatHistory.toString().split("\n");
        int start = Math.max(0, lines.length - 4);
        StringBuilder visible = new StringBuilder();
        for (int i = start; i < lines.length; i++) visible.append(lines[i]).append("\n");
        chatTxt.text(visible.toString());
        chatTxt.setPos(chatTxt.left(), chatTxt.top());
    }

    private void refresh() {
        if (playersTxt == null) return;
        StringBuilder sb = new StringBuilder();
        for (NetPlayer p : client.getPlayers()) {
            sb.append(p.ready ? "✔ " : "○ ")
              .append(p.name)
              .append(p.id == client.getPlayerId() ? " (te)" : "")
              .append("\n");
        }
        playersTxt.text(sb.toString());
        playersTxt.setPos(playersTxt.left(), playersTxt.top());
    }

    @Override
    public void hide() {
        client.removeListener(listener);
        super.hide();
    }

    // Prevent back-press from closing this overlay (must use Leave)
    @Override
    public void onBackPressed() {
        // do nothing
    }
}
