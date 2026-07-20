const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ─── Sound Module ─────────────────────────────────────────────────────────────
const Sound = (() => {
    let currentMusic = null;
    let currentMusicPath = '';
    let sfxVolume = 0.6;
    let musicVolume = 0.4;

    function playSfx(file) {
        try {
            const audio = new Audio(`/assets/sounds/${file}`);
            audio.volume = sfxVolume;
            audio.play().catch(e => {});
        } catch(e) {}
    }

    return {
        // SFX Playbacks
        hit()       { playSfx('hit.mp3'); },
        playerHit() { playSfx('hit_slash.mp3'); },
        door()      { playSfx('door_open.mp3'); },
        stairs()    { playSfx('descend.mp3'); },
        chest()     { playSfx('unlock.mp3'); },
        levelUp()   { playSfx('levelup.mp3'); },
        death()     { playSfx('death.mp3'); },
        trap()      { playSfx('trap.mp3'); },
        pickup()    { playSfx('gold.mp3'); },
        step()      { playSfx('step.mp3'); },
        drink()     { playSfx('drink.mp3'); },
        eat()       { playSfx('eat.mp3'); },
        read()      { playSfx('read.mp3'); },

        // Music Controls
        playMusic(file) {
            try {
                const path = `/assets/music/${file}`;
                if (currentMusicPath === path) {
                    if (currentMusic && currentMusic.paused) {
                        currentMusic.play().catch(e => {});
                    }
                    return;
                }
                if (currentMusic) {
                    currentMusic.pause();
                    currentMusic = null;
                }
                currentMusic = new Audio(path);
                currentMusic.loop = true;
                currentMusic.volume = musicVolume;
                currentMusicPath = path;
                currentMusic.play().catch(e => {
                    console.log("Music autoplay prevented, waiting for user interaction.");
                });
            } catch(e) {}
        },

        stopMusic() {
            if (currentMusic) {
                currentMusic.pause();
                currentMusic = null;
                currentMusicPath = '';
            }
        },

        setMusicVolume(vol) {
            musicVolume = vol;
            if (currentMusic) currentMusic.volume = vol;
        },

        setSfxVolume(vol) {
            sfxVolume = vol;
        }
    };
})();

const GameState = {
    localPlayer: null,
    remotePlayer: null,
    mobs: [],
    map: null,
    depth: 1,
    activeItemIndex: -1,
    damageTexts: [],
    tileSize: 16,
    scale: 3,
    camera: { x: 0, y: 0 },
    lastMoveTime: 0,
    moveCooldown: 180,
    singlePlayer: true,
    classChosen: false,
    miniMapOpen: false,
    turnCount: 0        // global turn counter
};

// Log helper to feed chat/action panel
function logMessage(text, type = 'system') {
    const chatLog = document.getElementById('chatLog');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${type}`;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    msg.textContent = `[${time}] ${text}`;
    chatLog.appendChild(msg);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Float damage text indicators
function addDamageText(x, y, text, color = '#ff4d4d') {
    GameState.damageTexts.push({ x: x + 0.5, y: y - 0.2, text, color, life: 1.0 });
}

function initGame(heroClass, playerName) {
    GameState.classChosen = true;
    let startX = 5;
    let startY = 5;

    if (Network.isHost || GameState.singlePlayer) {
        GameState.map = generateDungeon(36, 36);
        startX = GameState.map.stairsUp.x;
        startY = GameState.map.stairsUp.y;
        GameState.localPlayer = new Player(startX, startY, heroClass, playerName);
        spawnMobsForLevel();
        computeFOV(GameState.map, GameState.localPlayer.x, GameState.localPlayer.y, 8);

        if (!GameState.singlePlayer) {
            sendFullWorldState();
            logMessage(`${playerName} hosted the dungeon as ${HERO_CLASSES[heroClass].name}.`, 'system');
        } else {
            logMessage(`Dungeon depth ${GameState.depth} generated. Beware!`, 'system');
        }
    } else {
        GameState.localPlayer = new Player(startX, startY, heroClass, playerName);
        Network.send('CHOOSE_CLASS', { heroClass, name: playerName, x: startX, y: startY });
        logMessage(`Connecting to host as ${HERO_CLASSES[heroClass].name}...`, 'system');
    }

    window.addEventListener('keydown', handleKeyboardInput);
    canvas.addEventListener('click', handleCanvasClick);
    requestAnimationFrame(gameLoop);
    updateHUD();
}

function spawnMobsForLevel() {
    GameState.mobs = [];
    const mobTypesList = ['rat', 'crab'];
    if (GameState.depth >= 2) mobTypesList.push('gnoll');
    if (GameState.depth >= 3) mobTypesList.push('eye');

    for (let i = 1; i < GameState.map.rooms.length; i++) {
        let r = GameState.map.rooms[i];
        let numMobs = Math.floor(Math.random() * 2) + 1;
        for (let m = 0; m < numMobs; m++) {
            let mx = r.x + 1 + Math.floor(Math.random() * (r.w - 2));
            let my = r.y + 1 + Math.floor(Math.random() * (r.h - 2));
            let type = mobTypesList[Math.floor(Math.random() * mobTypesList.length)];
            GameState.mobs.push(new Mob(mx, my, type));
        }
    }
}

function sendFullWorldState() {
    Network.send('START_GAME', {
        mapTiles: GameState.map.tiles,
        mapW: GameState.map.width,
        mapH: GameState.map.height,
        stairsUp: GameState.map.stairsUp,
        stairsDown: GameState.map.stairsDown,
        mobs: GameState.mobs.map(m => ({ x: m.x, y: m.y, type: m.type, hp: m.hp, maxHp: m.maxHp, isDead: m.isDead })),
        heaps: GameState.map.heaps.map(h => ({ x: h.x, y: h.y, item: { type: h.item.type, name: h.item.name, amount: h.item.amount, spriteIndex: h.item.spriteIndex } })),
        hostPlayer: {
            x: GameState.localPlayer.x,
            y: GameState.localPlayer.y,
            hp: GameState.localPlayer.hp,
            maxHp: GameState.localPlayer.maxHp,
            classKey: GameState.localPlayer.classKey,
            name: GameState.localPlayer.name,
            isDead: GameState.localPlayer.isDead
        }
    });
}

function handleKeyboardInput(e) {
    if (!GameState.localPlayer || GameState.localPlayer.isDead) return;
    const now = Date.now();
    if (now - GameState.lastMoveTime < GameState.moveCooldown) return;

    let dx = 0, dy = 0;
    if      (e.key === 'ArrowUp'    || e.key === 'w' || e.key === 'W') dy = -1;
    else if (e.key === 'ArrowDown'  || e.key === 's' || e.key === 'S') dy = 1;
    else if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') dx = -1;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dx = 1;
    else if (e.key === ' ')      { performAction(0, 0); GameState.lastMoveTime = now; return; }
    else if (e.key === 'm' || e.key === 'M') { toggleMiniMap(); return; }
    else return;

    performAction(dx, dy);
    GameState.lastMoveTime = now;
}

function handleCanvasClick(e) {
    if (!GameState.localPlayer || GameState.localPlayer.isDead) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const tileW = GameState.tileSize * GameState.scale;
    const originX = canvas.width / 2 - GameState.camera.x * tileW;
    const originY = canvas.height / 2 - GameState.camera.y * tileW;
    const gridX = Math.floor((clickX - originX) / tileW);
    const gridY = Math.floor((clickY - originY) / tileW);
    const dist = Math.max(Math.abs(gridX - GameState.localPlayer.x), Math.abs(gridY - GameState.localPlayer.y));
    if (dist <= 1) performAction(gridX - GameState.localPlayer.x, gridY - GameState.localPlayer.y);
}

function performAction(dx, dy) {
    if (dx < 0) GameState.localPlayer.flipX = true;
    if (dx > 0) GameState.localPlayer.flipX = false;

    if (GameState.singlePlayer || Network.isHost) {
        processTurn(GameState.localPlayer, dx, dy);
    } else {
        Network.send('MOVE_REQUEST', { dx, dy });
    }
}

function processTurn(actor, dx, dy) {
    const tx = actor.x + dx;
    const ty = actor.y + dy;

    // Advance turn counter
    if (actor instanceof Player) {
        actor.turnCount++;
        GameState.turnCount++;

        // ── Hunger drain: 0.5 per step (or 0.25 if standing still) ───────────
        actor.hunger = Math.max(0, actor.hunger - (dx === 0 && dy === 0 ? 0.25 : 0.5));

        // ── Starvation HP damage ───────────────────────────────────────────
        if (actor.hungerState === 'starving' && actor.turnCount % 8 === 0) {
            actor.takeDamage(1);
            addDamageText(actor.x, actor.y, '-1', '#e67e22');
            logMessage(I18n.t('hunger.starving'), 'combat');
        }

        // ── HP Regen: only when well-fed or hungry, not recently damaged ───
        if (actor.hungerState !== 'starving' &&
            actor.hp < actor.maxHp &&
            (actor.turnCount - actor.lastDamageTurn) >= 12 &&
            actor.turnCount % 12 === 0) {
            actor.heal(1);
            addDamageText(actor.x, actor.y, '+1', '#2ecc71');
        }
    }

    // 1. Combat check
    let hitMob = GameState.mobs.find(m => m.x === tx && m.y === ty && !m.isDead);
    if (hitMob && actor instanceof Player) {
        actor.animState = 'attack';
        const dmg = Math.floor(Math.random() * actor.baseDmg) + 1;
        hitMob.takeDamage(dmg);
        addDamageText(hitMob.x, hitMob.y, `-${dmg}`, '#e74c3c');
        logMessage(`${actor.name} hits ${hitMob.name} for ${dmg} damage.`, 'combat');
        Sound.hit();

        if (hitMob.isDead) {
            logMessage(`${hitMob.name} is defeated!`, 'combat');
            const lootGold = Math.floor(Math.random() * 5) + hitMob.xp;
            actor.gold += lootGold;
            addDamageText(hitMob.x, hitMob.y, `+${lootGold}g`, '#f1c40f');
            Sound.pickup();
            if (actor.gainXp(hitMob.xp)) {
                logMessage(I18n.t('msg.level_up', { n: actor.name, l: actor.level }), 'system');
                addDamageText(actor.x, actor.y, 'LEVEL UP!', '#f1c40f');
                Sound.levelUp();
            }
        }
        triggerMobTurn();
        syncAllState();
        return;
    }

    // 2. Chest interaction
    const tile = GameState.map.getTile(tx, ty);
    if (tile === Assets.Terrain.CHEST) {
        GameState.map.setTile(tx, ty, Assets.Terrain.EMPTY);
        const goldLoot = Math.floor(Math.random() * 15) + 5;
        actor.gold += goldLoot;
        addDamageText(tx, ty, `+${goldLoot}g`, '#f1c40f');
        logMessage(`${actor.name} opened a chest and found ${goldLoot} gold!`, 'system');
        Sound.chest();

        if (Math.random() < 0.6) {
            const itemsPool = [
                { type: 'potion', name: I18n.t('item.healing_potion'), sprite: 352 },
                { type: 'scroll', name: I18n.t('item.scroll_magic_map'), sprite: 304 },
                { type: 'food',   name: I18n.t('item.ration'),           sprite: 32  }
            ];
            const chosen = itemsPool[Math.floor(Math.random() * itemsPool.length)];
            actor.inventory.push(new Item(chosen.type, chosen.name, 1, chosen.sprite));
            logMessage(`Found a ${chosen.name}!`, 'system');
        }
        triggerMobTurn();
        syncAllState();
        return;
    }

    // 2.5. Locked Door check
    if (tile === Assets.Terrain.LOCKED_DOOR) {
        if (actor instanceof Player) {
            const keyIdx = actor.inventory.findIndex(item => item.name === 'Golden Key' && item.amount > 0);
            if (keyIdx !== -1) {
                // Consume key
                const keyItem = actor.inventory[keyIdx];
                keyItem.amount--;
                if (keyItem.amount <= 0) actor.inventory.splice(keyIdx, 1);

                GameState.map.setTile(tx, ty, Assets.Terrain.OPEN_DOOR);
                logMessage(`${actor.name} unlocked the door with a Golden Key.`, 'system');
                Sound.door();

                triggerMobTurn();
                syncAllState();
            } else {
                if (actor === GameState.localPlayer) {
                    logMessage('This door is locked. You need a Golden Key to open it.', 'system');
                }
            }
        }
        return;
    }

    // 3. Door opening
    if (tile === Assets.Terrain.DOOR) {
        GameState.map.setTile(tx, ty, Assets.Terrain.OPEN_DOOR);
        logMessage(`${actor.name} opens the door.`, 'system');
        Sound.door();
        triggerMobTurn();
        syncAllState();
        return;
    }

    // 4. Movement
    if (!GameState.map.isBlocked(tx, ty)) {
        const otherPlayer = (actor === GameState.localPlayer) ? GameState.remotePlayer : GameState.localPlayer;
        if (!otherPlayer || otherPlayer.isDead || otherPlayer.x !== tx || otherPlayer.y !== ty) {
            actor.x = tx;
            actor.y = ty;
            actor.animState = 'walk';

            // Play step sound for local player's movement
            if (actor === GameState.localPlayer && (dx !== 0 || dy !== 0)) {
                Sound.step();
            }

            // ── Ground loot heap collection ──────────────────────────────────
            const heapIdx = GameState.map.heaps.findIndex(h => h.x === tx && h.y === ty);
            if (heapIdx !== -1) {
                const heap = GameState.map.heaps[heapIdx];
                if (heap.item.type === 'gold') {
                    actor.gold += heap.item.amount;
                    logMessage(`${actor.name} picked up ${heap.item.amount} gold.`, 'system');
                    addDamageText(tx, ty, `+${heap.item.amount}g`, '#f1c40f');
                    Sound.pickup();
                } else {
                    const existing = actor.inventory.find(i => i.name === heap.item.name && i.type === heap.item.type);
                    if (existing && heap.item.type !== 'weapon' && heap.item.type !== 'armor') {
                        existing.amount += heap.item.amount;
                    } else {
                        actor.inventory.push(heap.item);
                    }
                    logMessage(`${actor.name} found: ${heap.item.name}.`, 'system');
                    addDamageText(tx, ty, `+1 Item`, '#66fcf1');
                    Sound.pickup();
                }
                GameState.map.heaps.splice(heapIdx, 1);
            }

            // ── Trap activation ──────────────────────────────────────────────
            const landedTile = GameState.map.getTile(tx, ty);
            if (landedTile === Assets.Terrain.TRAP) {
                // Rogues have 30% chance to avoid traps
                const dodged = (actor.classKey === 'rogue') && Math.random() < 0.30;
                if (!dodged) {
                    const trapDmg = Math.max(1, Math.floor(GameState.depth * 0.8));
                    actor.takeDamage(trapDmg);
                    addDamageText(tx, ty, `-${trapDmg}`, '#e67e22');
                    logMessage(I18n.t('trap.activated'), 'combat');
                    Sound.trap();
                    if (actor.isDead) Sound.death();
                } else {
                    logMessage('You notice and avoid a trap!', 'system');
                }
                GameState.map.setTile(tx, ty, Assets.Terrain.INACTIVE_TRAP);
            }

            // ── Stairs down ──────────────────────────────────────────────────
            if (GameState.map.getTile(tx, ty) === Assets.Terrain.EXIT && actor === GameState.localPlayer) {
                Sound.stairs();
                advanceLevel();
                return;
            }
        }
    }

    // Recompute FOV
    if (actor === GameState.localPlayer) {
        GameState.map.resetVisibility();
        computeFOV(GameState.map, GameState.localPlayer.x, GameState.localPlayer.y, 8);
        if (GameState.remotePlayer && !GameState.remotePlayer.isDead) {
            computeFOV(GameState.map, GameState.remotePlayer.x, GameState.remotePlayer.y, 8);
        }
    }

    triggerMobTurn();
    syncAllState();
}

function triggerMobTurn() {
    GameState.mobs.forEach(mob => {
        if (mob.isDead) return;

        let players = [GameState.localPlayer];
        if (GameState.remotePlayer && !GameState.remotePlayer.isDead) players.push(GameState.remotePlayer);

        let target = null;
        let minDist = 999;
        players.forEach(p => {
            let d = Math.max(Math.abs(p.x - mob.x), Math.abs(p.y - mob.y));
            if (d < minDist && d < 10) { minDist = d; target = p; }
        });

        if (target) {
            const path = findPath(GameState.map, mob.x, mob.y, target.x, target.y);
            if (path && path.length > 0) {
                const next = path[0];
                if (next.x === target.x && next.y === target.y) {
                    // Attack!
                    const dmg = Math.floor(Math.random() * mob.dmg) + 1;
                    target.takeDamage(dmg);
                    Sound.playerHit();
                    addDamageText(target.x, target.y, `-${dmg}`, '#d32f2f');
                    logMessage(`${mob.name} attacks ${target.name} for ${dmg} damage!`, 'combat');
                    if (target.isDead) { logMessage(`${target.name} has fallen!`, 'combat'); Sound.death(); }
                } else {
                    // Move toward player
                    if (next.x < mob.x) mob.flipX = true;
                    if (next.x > mob.x) mob.flipX = false;
                    mob.x = next.x;
                    mob.y = next.y;
                    mob.animState = 'walk';
                }
            }
        }
    });
}

function advanceLevel() {
    GameState.depth++;
    
    // Dynamically adjust ambient background soundtrack based on dungeon depth
    if (GameState.depth === 5) {
        Sound.playMusic('sewers_boss.ogg');
    } else if (GameState.depth > 5) {
        Sound.playMusic('sewers_tense.ogg');
    } else if (GameState.depth === 3 || GameState.depth === 4) {
        Sound.playMusic('sewers_2.ogg');
    } else {
        Sound.playMusic('sewers_1.ogg');
    }

    GameState.map = generateDungeon(36, 36);
    GameState.localPlayer.x = GameState.map.stairsUp.x;
    GameState.localPlayer.y = GameState.map.stairsUp.y;

    if (GameState.remotePlayer) {
        GameState.remotePlayer.x = GameState.map.stairsUp.x + 1;
        GameState.remotePlayer.y = GameState.map.stairsUp.y;
    }

    spawnMobsForLevel();
    GameState.map.resetVisibility();
    computeFOV(GameState.map, GameState.localPlayer.x, GameState.localPlayer.y, 8);
    logMessage(`Descended to dungeon depth ${GameState.depth}. The air grows colder.`, 'system');
    addDamageText(GameState.localPlayer.x, GameState.localPlayer.y, `Depth ${GameState.depth}`, '#66fcf1');
    updateHUD();
}

function syncAllState() {
    updateHUD();
    if (GameState.singlePlayer) return;

    Network.send('SYNC_STATE', {
        localPlayer: {
            x: GameState.localPlayer.x,
            y: GameState.localPlayer.y,
            hp: GameState.localPlayer.hp,
            maxHp: GameState.localPlayer.maxHp,
            level: GameState.localPlayer.level,
            xp: GameState.localPlayer.xp,
            gold: GameState.localPlayer.gold,
            classKey: GameState.localPlayer.classKey,
            isDead: GameState.localPlayer.isDead
        },
        remotePlayer: GameState.remotePlayer ? {
            x: GameState.remotePlayer.x,
            y: GameState.remotePlayer.y,
            hp: GameState.remotePlayer.hp,
            maxHp: GameState.remotePlayer.maxHp,
            level: GameState.remotePlayer.level,
            xp: GameState.remotePlayer.xp,
            gold: GameState.remotePlayer.gold,
            classKey: GameState.remotePlayer.classKey,
            isDead: GameState.remotePlayer.isDead
        } : null,
        mobs: GameState.mobs.map(m => ({ x: m.x, y: m.y, hp: m.hp, maxHp: m.maxHp, type: m.type, isDead: m.isDead })),
        tiles: GameState.map.tiles,
        heaps: GameState.map.heaps.map(h => ({ x: h.x, y: h.y, item: { type: h.item.type, name: h.item.name, amount: h.item.amount, spriteIndex: h.item.spriteIndex } }))
    });
}

function updateHUD() {
    if (!GameState.localPlayer) return;
    const p = GameState.localPlayer;
    document.getElementById('hudName').textContent  = p.name;
    document.getElementById('hudClass').textContent = (typeof HERO_CLASSES !== 'undefined' && HERO_CLASSES[p.classKey])
        ? I18n.t(`hero.${p.classKey}.name`)
        : p.classKey;
    document.getElementById('hudLevel').textContent = p.level;
    document.getElementById('hudGold').textContent  = p.gold;
    document.getElementById('hudDepth').textContent = GameState.depth;

    // HP Bar
    const hpRatio = Math.max(0, (p.hp / p.maxHp) * 100);
    document.getElementById('hpFill').style.width = `${hpRatio}%`;
    document.getElementById('hpText').textContent  = `${p.hp} / ${p.maxHp}`;

    // Hunger Bar
    const hungerFill = document.getElementById('hungerFill');
    const hungerText = document.getElementById('hungerText');
    if (hungerFill && hungerText) {
        const hungerRatio = Math.max(0, p.hunger);
        hungerFill.style.width = `${hungerRatio}%`;
        const state = p.hungerState;
        hungerFill.className = `hunger-bar-fill hunger-${state}`;
        hungerText.textContent = I18n.t(`hunger.${state}`);
        hungerText.className   = `hud-value hunger-value hunger-state-${state}`;
    }
}

// PeerJS data routing
Network.onDataCallback = (data) => {
    switch (data.type) {
        case 'CHOOSE_CLASS':
            GameState.remotePlayer = new Player(data.payload.x, data.payload.y, data.payload.heroClass, data.payload.name);
            logMessage(`${data.payload.name} joined as ${HERO_CLASSES[data.payload.heroClass].name}!`, 'system');
            sendFullWorldState();
            syncAllState();
            break;

        case 'START_GAME':
            GameState.map = new DungeonMap(data.payload.mapW, data.payload.mapH);
            GameState.map.tiles = data.payload.mapTiles;
            GameState.map.stairsUp = data.payload.stairsUp;
            GameState.map.stairsDown = data.payload.stairsDown;
            GameState.map.heaps = data.payload.heaps ? data.payload.heaps.map(h => new Heap(h.x, h.y, new Item(h.item.type, h.item.name, h.item.amount, h.item.spriteIndex))) : [];
            GameState.remotePlayer = new Player(data.payload.hostPlayer.x, data.payload.hostPlayer.y, data.payload.hostPlayer.classKey, data.payload.hostPlayer.name);
            GameState.remotePlayer.hp = data.payload.hostPlayer.hp;
            GameState.remotePlayer.maxHp = data.payload.hostPlayer.maxHp;
            GameState.mobs = data.payload.mobs.map(m => {
                let mob = new Mob(m.x, m.y, m.type);
                mob.hp = m.hp; mob.maxHp = m.maxHp; mob.isDead = m.isDead;
                return mob;
            });
            GameState.localPlayer.x = GameState.map.stairsUp.x;
            GameState.localPlayer.y = GameState.map.stairsUp.y;
            GameState.map.resetVisibility();
            computeFOV(GameState.map, GameState.localPlayer.x, GameState.localPlayer.y, 8);
            logMessage(`Entered Dungeon Depth ${GameState.depth}! Good luck!`, 'system');
            updateHUD();
            break;

        case 'MOVE_REQUEST':
            if (Network.isHost && GameState.remotePlayer) {
                if (data.payload.dx < 0) GameState.remotePlayer.flipX = true;
                if (data.payload.dx > 0) GameState.remotePlayer.flipX = false;
                processTurn(GameState.remotePlayer, data.payload.dx, data.payload.dy);
            }
            break;

        case 'SYNC_STATE':
            if (!Network.isHost) {
                if (data.payload.remotePlayer) {
                    GameState.localPlayer.hp = data.payload.remotePlayer.hp;
                    GameState.localPlayer.maxHp = data.payload.remotePlayer.maxHp;
                    GameState.localPlayer.level = data.payload.remotePlayer.level;
                    GameState.localPlayer.xp = data.payload.remotePlayer.xp;
                    GameState.localPlayer.gold = data.payload.remotePlayer.gold;
                    GameState.localPlayer.isDead = data.payload.remotePlayer.isDead;
                }
                if (data.payload.localPlayer) {
                    GameState.remotePlayer.x = data.payload.localPlayer.x;
                    GameState.remotePlayer.y = data.payload.localPlayer.y;
                    GameState.remotePlayer.hp = data.payload.localPlayer.hp;
                    GameState.remotePlayer.isDead = data.payload.localPlayer.isDead;
                }
                data.payload.mobs.forEach((m, idx) => {
                    if (GameState.mobs[idx]) {
                        GameState.mobs[idx].x = m.x;
                        GameState.mobs[idx].y = m.y;
                        GameState.mobs[idx].hp = m.hp;
                        GameState.mobs[idx].isDead = m.isDead;
                    }
                });
                GameState.map.tiles = data.payload.tiles;
                if (data.payload.heaps) {
                    GameState.map.heaps = data.payload.heaps.map(h => new Heap(h.x, h.y, new Item(h.item.type, h.item.name, h.item.amount, h.item.spriteIndex)));
                }
                GameState.map.resetVisibility();
                computeFOV(GameState.map, GameState.localPlayer.x, GameState.localPlayer.y, 8);
                if (GameState.remotePlayer && !GameState.remotePlayer.isDead) {
                    computeFOV(GameState.map, GameState.remotePlayer.x, GameState.remotePlayer.y, 8);
                }
                updateHUD();
            }
            break;

        case 'CHAT':
            logMessage(data.payload.text, 'chat');
            break;

        case 'LOBBY_FULL':
            alert('Co-op Room is full or already in progress.');
            window.location.reload();
            break;
    }
};

// ─── Game Loop ───────────────────────────────────────────────────────────────

let lastTime = 0;
function gameLoop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(gameLoop);
}

function update(dt) {
    if (GameState.localPlayer) {
        GameState.localPlayer.updateAnimation(dt);
        GameState.localPlayer.updateRenderPos(dt);
    }
    if (GameState.remotePlayer) {
        GameState.remotePlayer.updateAnimation(dt);
        GameState.remotePlayer.updateRenderPos(dt);
    }
    GameState.mobs.forEach(mob => {
        mob.updateAnimation(dt);
        mob.updateRenderPos(dt);
    });

    // Floating damage texts
    for (let i = GameState.damageTexts.length - 1; i >= 0; i--) {
        const t = GameState.damageTexts[i];
        t.y -= 0.6 * dt;
        t.life -= dt * 1.5;
        if (t.life <= 0) GameState.damageTexts.splice(i, 1);
    }

    // Camera follows interpolated position
    if (GameState.localPlayer) {
        const lp = GameState.localPlayer;
        GameState.camera.x += (lp.renderX - GameState.camera.x) * 0.14;
        GameState.camera.y += (lp.renderY - GameState.camera.y) * 0.14;
    }

    // Auto-refresh mini-map while open
    if (GameState.miniMapOpen) renderMiniMap();
}

// ─── Renderer ────────────────────────────────────────────────────────────────

function render() {
    ctx.fillStyle = '#020205';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!GameState.map) return;

    const tileW = GameState.tileSize * GameState.scale;
    const tileH = tileW;
    const ox = Math.floor(canvas.width  / 2 - GameState.camera.x * tileW);
    const oy = Math.floor(canvas.height / 2 - GameState.camera.y * tileH);

    // ── Tile layer ──────────────────────────────────────────────────────────
    for (let y = 0; y < GameState.map.height; y++) {
        for (let x = 0; x < GameState.map.width; x++) {
            const tileIdx = y * GameState.map.width + x;
            if (!GameState.map.discovered[tileIdx]) continue;

            const dx = ox + x * tileW;
            const dy = oy + y * tileH;

            const terrainId = GameState.map.tiles[tileIdx];

            // Draw base floor for overlay terrain types
            if (terrainId === Assets.Terrain.CHEST ||
                terrainId === Assets.Terrain.GRASS  ||
                terrainId === Assets.Terrain.WATER  ||
                terrainId === Assets.Terrain.HIGH_GRASS ||
                Assets.doorTile(terrainId)) {
                // Draw empty floor first (index 0)
                Assets.drawTile(ctx, 'tiles_sewers', 0, dx, dy, tileW, tileH);
            }

            // Draw terrain layer
            const terrainVisual = Assets.getTerrainVisual(GameState.map.tiles, tileIdx, GameState.map.width, GameState.map.height);
            if (terrainVisual !== -1) {
                Assets.drawTile(ctx, 'tiles_sewers', terrainVisual, dx, dy, tileW, tileH);
            }

            // Draw walls/overhang layer
            const wallVisual = Assets.getWallVisual(GameState.map.tiles, tileIdx, GameState.map.width, GameState.map.height);
            if (wallVisual !== -1) {
                Assets.drawTile(ctx, 'tiles_sewers', wallVisual, dx, dy, tileW, tileH);
            }

            // Draw chest icon on top using items.png (CHEST = index 36 in items.png)
            if (terrainId === Assets.Terrain.CHEST) {
                Assets.drawSprite(ctx, 'items', 36, dx, dy, tileW, tileH, false);
            }

            // Draw trap X marker for active traps (visible after discovery)
            if (terrainId === Assets.Terrain.TRAP) {
                ctx.strokeStyle = 'rgba(231, 76, 60, 0.90)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(dx + 5, dy + 5);       ctx.lineTo(dx + tileW - 5, dy + tileH - 5);
                ctx.moveTo(dx + tileW - 5, dy + 5); ctx.lineTo(dx + 5, dy + tileH - 5);
                ctx.stroke();
            }


            // Fog of War overlay for discovered but not currently visible tiles
            if (!GameState.map.visible[tileIdx]) {
                ctx.fillStyle = 'rgba(2, 2, 5, 0.65)';
                ctx.fillRect(dx, dy, tileW, tileH);
            }
        }
    }

    // ── Ground heaps layer ──────────────────────────────────────────────────
    if (GameState.map.heaps) {
        GameState.map.heaps.forEach(heap => {
            const tileIdx = heap.y * GameState.map.width + heap.x;
            if (!GameState.map.discovered[tileIdx]) return; // Only draw if discovered

            const dx = ox + heap.x * tileW;
            const dy = oy + heap.y * tileH;

            // Draw item icon from items.png
            Assets.drawSprite(ctx, 'items', heap.item.spriteIndex, dx, dy, tileW, tileH, false);

            // Fog of War overlay for heaps in discovered but not visible tiles
            if (!GameState.map.visible[tileIdx]) {
                ctx.fillStyle = 'rgba(2, 2, 5, 0.65)';
                ctx.fillRect(dx, dy, tileW, tileH);
            }
        });
    }

    // ── Mob layer ───────────────────────────────────────────────────────────
    GameState.mobs.forEach(mob => {
        if (mob.isDead) return;
        // Visibility uses logical grid position
        const tileIdx = mob.y * GameState.map.width + mob.x;
        if (!GameState.map.visible[tileIdx]) return;

        // Draw at interpolated pixel position
        const dx = ox + mob.renderX * tileW;
        const dy = oy + mob.renderY * tileH;

        Assets.drawSprite(ctx, mob.spriteKey, mob.frame, dx, dy, tileW, tileH, mob.flipX);

        // HP bar
        if (mob.hp < mob.maxHp) {
            const barW = tileW - 4;
            ctx.fillStyle = '#800000';
            ctx.fillRect(dx + 2, dy - 5, barW, 3);
            ctx.fillStyle = '#e74c3c';
            ctx.fillRect(dx + 2, dy - 5, barW * (mob.hp / mob.maxHp), 3);
        }
    });

    // ── Remote player layer ─────────────────────────────────────────────────
    if (GameState.remotePlayer && !GameState.remotePlayer.isDead) {
        // Visibility uses logical grid position
        const tileIdx = GameState.remotePlayer.y * GameState.map.width + GameState.remotePlayer.x;
        if (GameState.map.visible[tileIdx]) {
            const dx = ox + GameState.remotePlayer.renderX * tileW;
            const dy = oy + GameState.remotePlayer.renderY * tileH;
            Assets.drawSprite(ctx, GameState.remotePlayer.spriteKey, GameState.remotePlayer.frame, dx, dy, tileW, tileH, GameState.remotePlayer.flipX);
            ctx.font = '7px "Press Start 2P"';
            ctx.fillStyle = '#a8d8ff';
            ctx.textAlign = 'center';
            ctx.fillText(GameState.remotePlayer.name, dx + tileW / 2, dy - 7);
        }
    }

    // ── Local player layer ──────────────────────────────────────────────────
    if (GameState.localPlayer && !GameState.localPlayer.isDead) {
        const dx = ox + GameState.localPlayer.renderX * tileW;
        const dy = oy + GameState.localPlayer.renderY * tileH;
        Assets.drawSprite(ctx, GameState.localPlayer.spriteKey, GameState.localPlayer.frame, dx, dy, tileW, tileH, GameState.localPlayer.flipX);
        ctx.font = '7px "Press Start 2P"';
        ctx.fillStyle = '#66fcf1';
        ctx.textAlign = 'center';
        ctx.fillText(GameState.localPlayer.name, dx + tileW / 2, dy - 7);
    }

    // ── Floating damage texts ───────────────────────────────────────────────
    ctx.font = '9px "Press Start 2P"';
    ctx.textAlign = 'center';
    GameState.damageTexts.forEach(t => {
        const dx = ox + t.x * tileW;
        const dy = oy + t.y * tileH;
        ctx.globalAlpha = Math.max(0, t.life);
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, dx, dy);
    });
    ctx.globalAlpha = 1.0;

    // ── Death overlay ───────────────────────────────────────────────────────
    if (GameState.localPlayer && GameState.localPlayer.isDead) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px "Press Start 2P"';
        ctx.fillStyle = '#ff4d4d';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillStyle = '#c5c6c7';
        ctx.fillText('Press F5 to restart', canvas.width / 2, canvas.height / 2 + 20);
    }
}

// ─── Mini-Map ─────────────────────────────────────────────────────────────────

function toggleMiniMap() {
    GameState.miniMapOpen = !GameState.miniMapOpen;
    const overlay = document.getElementById('miniMapOverlay');
    if (overlay) overlay.classList.toggle('hidden', !GameState.miniMapOpen);
    if (GameState.miniMapOpen) renderMiniMap();
}

function renderMiniMap() {
    const mc = document.getElementById('miniMapCanvas');
    if (!mc || !GameState.map) return;
    const mCtx = mc.getContext('2d');
    const CELL = Math.min(Math.floor(mc.width / GameState.map.width), Math.floor(mc.height / GameState.map.height));
    const offX = Math.floor((mc.width  - GameState.map.width  * CELL) / 2);
    const offY = Math.floor((mc.height - GameState.map.height * CELL) / 2);

    mCtx.fillStyle = '#020205';
    mCtx.fillRect(0, 0, mc.width, mc.height);

    for (let y = 0; y < GameState.map.height; y++) {
        for (let x = 0; x < GameState.map.width; x++) {
            const idx = y * GameState.map.width + x;
            if (!GameState.map.discovered[idx]) continue;
            const t = GameState.map.tiles[idx];
            let color;
            if (t === Assets.Terrain.WALL)     color = '#3a3f5c';
            else if (t === Assets.Terrain.WATER) color = '#1a3a5c';
            else if (t === Assets.Terrain.ENTRANCE) color = '#66fcf1';
            else if (t === Assets.Terrain.EXIT)     color = '#ff9800';
            else if (t === Assets.Terrain.DOOR || t === Assets.Terrain.OPEN_DOOR) color = '#c5a028';
            else if (t === Assets.Terrain.LOCKED_DOOR) color = '#ff007f'; // Locked door color
            else if (t === Assets.Terrain.CHEST)    color = '#ffd700';
            else if (t === Assets.Terrain.TRAP)     color = '#e74c3c';
            else if (t === Assets.Terrain.GRASS || t === Assets.Terrain.HIGH_GRASS) color = '#2a6b2a';
            else color = '#5a6472';

            const visible = GameState.map.visible[idx];
            mCtx.globalAlpha = visible ? 1.0 : 0.45;
            mCtx.fillStyle = color;
            mCtx.fillRect(offX + x * CELL, offY + y * CELL, CELL, CELL);
        }
    }
    mCtx.globalAlpha = 1.0;

    // Ground heaps as yellow-green dots
    if (GameState.map.heaps) {
        GameState.map.heaps.forEach(heap => {
            const idx = heap.y * GameState.map.width + heap.x;
            if (!GameState.map.discovered[idx]) return;
            mCtx.fillStyle = '#c5fc66';
            mCtx.fillRect(offX + heap.x * CELL, offY + heap.y * CELL, CELL, CELL);
        });
    }

    // Mobs as red dots
    GameState.mobs.forEach(mob => {
        if (mob.isDead) return;
        const idx = mob.y * GameState.map.width + mob.x;
        if (!GameState.map.visible[idx]) return;
        mCtx.fillStyle = '#e74c3c';
        mCtx.fillRect(offX + mob.x * CELL, offY + mob.y * CELL, CELL, CELL);
    });

    // Local player as bright teal dot
    if (GameState.localPlayer && !GameState.localPlayer.isDead) {
        const lp = GameState.localPlayer;
        mCtx.fillStyle = '#66fcf1';
        mCtx.fillRect(offX + lp.x * CELL, offY + lp.y * CELL, CELL, CELL);
    }

    // Remote player as blue dot
    if (GameState.remotePlayer && !GameState.remotePlayer.isDead) {
        const rp = GameState.remotePlayer;
        mCtx.fillStyle = '#a8d8ff';
        mCtx.fillRect(offX + rp.x * CELL, offY + rp.y * CELL, CELL, CELL);
    }
}

// Auto-refresh mini-map each frame while open (handled inside update())

function resizeCanvas() {
    const wrapper = document.getElementById('canvasWrapper');
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ─── Inventory UI ─────────────────────────────────────────────────────────────

function toggleInventory() {
    const modal = document.getElementById('inventoryModal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) renderInventoryList();
}

function renderInventoryList() {
    const grid = document.getElementById('invGrid');
    grid.innerHTML = '';

    GameState.localPlayer.inventory.forEach((item, idx) => {
        const cell = document.createElement('div');
        cell.className = 'inv-item';
        cell.onclick = () => selectInventoryItem(idx);

        // Render item icon into a mini canvas
        const mc = document.createElement('canvas');
        mc.width = 32;
        mc.height = 32;
        const mCtx = mc.getContext('2d');
        mCtx.imageSmoothingEnabled = false;

        const img = Assets.images['items'];
        if (img && img.width > 0) {
            const SIZE = 16;
            const cols = Math.floor(img.width / SIZE);
            const sx = (item.spriteIndex % cols) * SIZE;
            const sy = Math.floor(item.spriteIndex / cols) * SIZE;
            mCtx.drawImage(img, sx, sy, SIZE, SIZE, 0, 0, 32, 32);
        } else {
            // Fallback colored block
            mCtx.fillStyle = item.type === 'potion' ? '#2ecc71' : item.type === 'scroll' ? '#3498db' : '#e67e22';
            mCtx.fillRect(4, 4, 24, 24);
        }

        cell.appendChild(mc);

        if (item.amount > 1) {
            const amt = document.createElement('div');
            amt.className = 'inv-item-amount';
            amt.textContent = item.amount;
            cell.appendChild(amt);
        }

        grid.appendChild(cell);
    });

    document.getElementById('invDesc').textContent = 'Select an item to view its description.';
    document.getElementById('useBtn').classList.add('hidden');
    GameState.activeItemIndex = -1;
}

function selectInventoryItem(idx) {
    GameState.activeItemIndex = idx;
    const item = GameState.localPlayer.inventory[idx];

    // Deselect all, highlight chosen
    document.querySelectorAll('.inv-item').forEach((el, i) => {
        el.style.borderColor = i === idx ? 'var(--primary-neon)' : '';
    });

    let desc = '';
    if (item.type === 'potion') {
        desc = `${I18n.t('item.healing_potion')}\n\nRestores 50% of your maximum health when consumed.`;
    } else if (item.type === 'scroll') {
        desc = `${I18n.t('item.scroll_magic_map')}\n\nReveals the complete layout of the current dungeon floor.`;
    } else if (item.type === 'food') {
        desc = `${I18n.t('item.ration')}\n\nA simple food ration. Eat it to satisfy your hunger.`;
    } else if (item.type === 'weapon') {
        desc = `${item.name}\n\nYour equipped melee weapon.`;
    } else if (item.type === 'armor') {
        desc = `${item.name}\n\nYour equipped armor providing damage reduction.`;
    } else {
        desc = item.name;
    }

    document.getElementById('invDesc').textContent = desc;

    const useable = item.type === 'potion' || item.type === 'scroll' || item.type === 'food';
    document.getElementById('useBtn').classList.toggle('hidden', !useable);
}

function useSelectedItem() {
    if (GameState.activeItemIndex === -1) return;
    const item = GameState.localPlayer.inventory[GameState.activeItemIndex];

    if (item.type === 'potion') {
        const heal = Math.floor(GameState.localPlayer.maxHp * 0.5);
        GameState.localPlayer.heal(heal);
        logMessage(`You drink a Healing Potion and recover ${heal} HP!`, 'system');
        addDamageText(GameState.localPlayer.x, GameState.localPlayer.y, `+${heal}`, '#2ecc71');
        Sound.pickup();
    } else if (item.type === 'scroll') {
        GameState.map.discovered.fill(true);
        logMessage('You read a Scroll of Magic Map. The floor is revealed!', 'system');
        Sound.pickup();
    } else if (item.type === 'food') {
        GameState.localPlayer.hunger = 100;
        logMessage('You eat a Food Ration. You feel full and satisfied!', 'system');
        addDamageText(GameState.localPlayer.x, GameState.localPlayer.y, 'FED', '#2ecc71');
        Sound.pickup();
    }

    item.amount--;
    if (item.amount <= 0) GameState.localPlayer.inventory.splice(GameState.activeItemIndex, 1);

    toggleInventory();

    if (GameState.singlePlayer || Network.isHost) {
        triggerMobTurn();
        syncAllState();
    } else {
        Network.send('MOVE_REQUEST', { dx: 0, dy: 0 });
    }
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const txt = input.value.trim();
    if (!txt) return;
    const formatted = `${GameState.localPlayer.name}: ${txt}`;
    logMessage(formatted, 'chat');
    if (!GameState.singlePlayer) Network.send('CHAT', { text: formatted });
    input.value = '';
}

document.getElementById('chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChatMessage();
});
