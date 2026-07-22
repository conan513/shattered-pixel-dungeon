/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * Multiplayer Turn Manager.
 * Controls the hybrid Explorer vs Battle Phase turn cycle.
 *
 * Explorer Phase:
 *   - No active monsters visible. Players can move freely.
 *
 * Battle Phase:
 *   - Triggered when 1+ monsters are visible/active.
 *   - Turn sequence: Host -> Client 1 -> Client 2 -> ... -> Host (cycles).
 *   - Each player gets 1 action per round (move/attack/item/wait).
 *   - Mobs act at their natural pace on the host (no strict turn slot).
 */

package com.shatteredpixel.shatteredpixeldungeon.multiplayer;

import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.mobs.Mob;

import java.util.ArrayList;
import java.util.List;

public class MpTurnManager {

	public static final MpTurnManager INSTANCE = new MpTurnManager();

	private boolean battlePhase = false;
	private int activePlayerId = -1;
	private int hostId = -1;
	private final List<Integer> playerOrder = new ArrayList<>();

	private MpTurnManager() {}

	public void reset() {
		battlePhase = false;
		activePlayerId = -1;
		hostId = -1;
		playerOrder.clear();
	}

	public void setHostId(int id) {
		this.hostId = id;
	}

	public int getHostId() {
		return hostId;
	}

	public boolean isHost(int playerId) {
		return playerId == hostId || (hostId == -1 && !playerOrder.isEmpty() && playerOrder.get(0) == playerId);
	}

	public boolean isBattlePhase() {
		return battlePhase;
	}

	public void setBattlePhase(boolean battle) {
		this.battlePhase = battle;
	}

	public int getActivePlayerId() {
		return activePlayerId;
	}

	public void setActivePlayerId(int id) {
		this.activePlayerId = id;
	}

	public void setPlayerOrder(List<NetPlayer> players) {
		playerOrder.clear();
		for (NetPlayer p : players) {
			playerOrder.add(p.id);
		}
		if (activePlayerId == -1 && !playerOrder.isEmpty()) {
			activePlayerId = playerOrder.get(0);
		}
	}

	public boolean isMyTurn(int myId) {
		if (!battlePhase) return true; // In Explorer Phase, everyone can act
		return activePlayerId == myId;
	}

	/**
	 * Advance turn to next player in join order.
	 * Returns true if all players have completed their round (cycled back to Host).
	 */
	public boolean nextTurn() {
		if (playerOrder.isEmpty()) return true;

		int currentIndex = playerOrder.indexOf(activePlayerId);
		if (currentIndex == -1 || currentIndex >= playerOrder.size() - 1) {
			// All players acted — cycle back to first player (Host)
			activePlayerId = playerOrder.get(0);
			return true;
		} else {
			activePlayerId = playerOrder.get(currentIndex + 1);
			return false;
		}
	}

	/**
	 * Checks if any active/awake mob is visible to the hero on the level.
	 */
	public boolean checkMonstersVisible() {
		if (Dungeon.level == null || Dungeon.level.mobs == null) return false;

		for (Mob mob : Dungeon.level.mobs) {
			if (mob.isAlive() && mob.state != mob.SLEEPING) {
				// Active monster present on level
				return true;
			}
		}
		return false;
	}
}
