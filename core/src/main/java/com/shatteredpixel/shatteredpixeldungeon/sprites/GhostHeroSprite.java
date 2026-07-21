/*
 * Shattered Pixel Dungeon
 * Copyright (C) 2014-2026 Evan Debenham
 *
 * GhostHeroSprite - A remote multiplayer hero sprite.
 * Unlike HeroSprite, this does NOT link to Dungeon.hero.
 * It is used purely for visual representation of remote players.
 */

package com.shatteredpixel.shatteredpixeldungeon.sprites;

import com.shatteredpixel.shatteredpixeldungeon.Assets;
import com.shatteredpixel.shatteredpixeldungeon.Dungeon;
import com.shatteredpixel.shatteredpixeldungeon.actors.hero.HeroClass;
import com.watabou.gltextures.TextureCache;
import com.watabou.noosa.TextureFilm;

/**
 * A standalone sprite for remote co-op players.
 * Does NOT link to Dungeon.hero - just displays a visual character at a given cell.
 */
public class GhostHeroSprite extends CharSprite {

    private static final int FRAME_WIDTH  = 12;
    private static final int FRAME_HEIGHT = 15;
    private static final int RUN_FRAMERATE = 20;

    private int currentCell = -1;

    public GhostHeroSprite(HeroClass heroClass) {
        super();
        // Set up texture using the hero class spritesheet
        texture(heroClass.spritesheet());
        setupAnimations(0); // tier 0 = no armor
    }

    private void setupAnimations(int tier) {
        TextureFilm film = new TextureFilm(HeroSprite.tiers(), tier, FRAME_WIDTH, FRAME_HEIGHT);

        idle    = new Animation(1, true);
        idle.frames(film, 0, 0, 0, 1, 0, 0, 1, 1);

        run     = new Animation(RUN_FRAMERATE, true);
        run.frames(film, 2, 3, 4, 5, 6, 7);

        die     = new Animation(20, false);
        die.frames(film, 8, 9, 10, 11, 12, 11);

        attack  = new Animation(15, false);
        attack.frames(film, 13, 14, 15, 0);

        zap     = attack.clone();

        operate = new Animation(8, false);
        operate.frames(film, 16, 17, 16, 17);

        idle();
    }

    /**
     * Place the sprite at a level cell without linking to any Char.
     */
    public void placeAt(int cell) {
        currentCell = cell;
        place(cell);
        idle();
    }

    /**
     * Move the sprite from one cell to another.
     * Calls CharSprite.move() which handles PosTweener internally.
     * Does NOT call Camera.main.panFollow (that's only in HeroSprite).
     */
    @Override
    public void move(int from, int to) {
        currentCell = to;
        super.move(from, to); // CharSprite.move() handles animation + PosTweener without camera follow
    }

    public int getCurrentCell() {
        return currentCell;
    }

    /**
     * Override to prevent NPE when motion completes.
     * CharSprite.onComplete() calls ch.onMotionComplete(), but ch is null for ghost sprites.
     */
    @Override
    public void onComplete(com.watabou.noosa.tweeners.Tweener tweener) {
        isMoving = false;
        if (tweener != null) {
            tweener.killAndErase();
        }
        // Do NOT call ch.onMotionComplete() — ch is null for ghost sprites
        idle();
        com.shatteredpixel.shatteredpixeldungeon.scenes.GameScene.sortMobSprites();
        synchronized (this) {
            notifyAll();
        }
    }
}
