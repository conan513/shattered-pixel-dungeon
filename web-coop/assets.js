const Assets = {
    images: {},
    loaded: false,
    onLoaded: null,

    assetList: {
        // Environment tilesets
        tiles_sewers: '/assets/environment/tiles_sewers.png',
        terrain_features: '/assets/environment/terrain_features.png',
        
        // Hero Sprites
        warrior: '/assets/sprites/warrior.png',
        mage: '/assets/sprites/mage.png',
        rogue: '/assets/sprites/rogue.png',
        huntress: '/assets/sprites/huntress.png',
        
        // Mob Sprites
        rat: '/assets/sprites/rat.png',
        crab: '/assets/sprites/crab.png',
        gnoll: '/assets/sprites/gnoll.png',
        eye: '/assets/sprites/eye.png',
        mimic: '/assets/sprites/mimic.png',
        ghost: '/assets/sprites/ghost.png',
        
        // Item Sprites
        items: '/assets/sprites/items.png',
        item_icons: '/assets/sprites/item_icons.png'
    },

    TILE_SIZE: 16,
    
    // Original Shattered Pixel Dungeon Terrain Constants (matches Terrain.java)
    Terrain: {
        CHASM: 0,
        EMPTY: 1,        // floor
        GRASS: 2,
        WALL: 4,
        DOOR: 5,
        OPEN_DOOR: 6,
        ENTRANCE: 7,     // stairs up
        EXIT: 8,         // stairs down
        LOCKED_DOOR: 10,
        TRAP: 11,        // active trap
        WALL_DECO: 12,
        INACTIVE_TRAP: 13, // trap already triggered
        HIGH_GRASS: 15,
        WATER: 29,
        CHEST: 100       // Custom: interactive chest container
    },

    // Maps original Terrain ID to exact visual index on tiles_sewers.png
    // Index formula: row * 16 + col  (tileset is 256x256, 16x16 tiles)
    // Matches DungeonTileSheet.java xy(col, row) with 1-indexed coords
    TileVisuals: {
        0:   24, // CHASM          → xy(9,2)
        1:    0, // EMPTY/FLOOR    → xy(1,1)
        2:    2, // GRASS          → xy(3,1)
        3:    3, // EMPTY_WELL     → xy(4,1)
        4:   48, // WALL (flat)    → FLAT_WALLS = xy(1,4)
        5:   56, // DOOR (flat)    → FLAT_DOOR = FLAT_WALLS+8
        6:   57, // OPEN_DOOR      → FLAT_DOOR_OPEN = FLAT_WALLS+9
        7:   16, // ENTRANCE       → GROUND+16
        8:   17, // EXIT           → GROUND+17
        10:  58, // LOCKED_DOOR    → FLAT_DOOR_LOCKED = FLAT_WALLS+10
        11:   1, // TRAP (active)  → renders as floor; trap X drawn on top in render
        12:  49, // WALL_DECO      → FLAT_WALL_DECO = FLAT_WALLS+1
        13:   1, // INACTIVE_TRAP  → renders as plain floor after trigger
        15:   2, // HIGH_GRASS     → shows as GRASS color
        29:  32, // WATER          → WATER = xy(1,3)
        100:  0  // CHEST          → draws FLOOR base, chest icon overlay from items.png
    },

    wallStitcheable(tile) {
        return tile === 4 || tile === 12 || tile === -1; // 4=WALL, 12=WALL_DECO, -1=NULL_TILE (out of bounds)
    },

    doorTile(tile) {
        return tile === 5 || tile === 6 || tile === 10; // 5=DOOR, 6=OPEN_DOOR, 10=LOCKED_DOOR
    },

    waterStitcheable(tile) {
        const WATER_STITCHEABLE = [1, 2, 7, 8, 11, 13, 15, 5, 6, 10];
        return WATER_STITCHEABLE.includes(tile);
    },

    getVisualWithAlts(visual, pos) {
        const variance = Math.floor(Math.abs(Math.sin(pos) * 10000)) % 100;
        if (variance >= 95) {
            if (visual === 0) return 12; // FLOOR -> FLOOR_ALT_2
        } else if (variance >= 50) {
            if (visual === 0) return 6;   // FLOOR -> FLOOR_ALT_1
            if (visual === 2) return 8;   // GRASS -> GRASS_ALT
            if (visual === 48) return 52; // FLAT_WALL -> FLAT_WALL_ALT
            if (visual === 49) return 53; // FLAT_WALL_DECO -> FLAT_WALL_DECO_ALT
            if (visual === 80) return 96; // RAISED_WALL -> RAISED_WALL_ALT
            if (visual === 84) return 100;// RAISED_WALL_DECO -> RAISED_WALL_DECO_ALT
        }
        return visual;
    },

    stitchWaterTile(top, right, bottom, left) {
        let result = 32; // WATER base index
        if (this.waterStitcheable(top))    result += 1;
        if (this.waterStitcheable(right))  result += 2;
        if (this.waterStitcheable(bottom)) result += 4;
        if (this.waterStitcheable(left))   result += 8;
        return result;
    },

    stitchChasmTile(above) {
        if (above === 1 || above === 2 || above === 7 || above === 8 || above === 11 || above === 13 || above === 15) {
            return 25; // CHASM_FLOOR
        }
        if (above === 4 || above === 5 || above === 6 || above === 10 || above === 12) {
            return 27; // CHASM_WALL
        }
        if (above === 29) {
            return 28; // CHASM_WATER
        }
        return 24; // CHASM base index
    },

    getRaisedWallTile(tile, pos, right, below, left) {
        let result;
        if (below === -1 || this.wallStitcheable(below)) {
            return -1;
        } else if (this.doorTile(below)) {
            result = 88; // RAISED_WALL_DOOR
        } else if (tile === 4) { // Terrain.WALL
            result = 80; // RAISED_WALL
        } else if (tile === 12) { // Terrain.WALL_DECO
            result = 84; // RAISED_WALL_DECO
        } else {
            return -1;
        }

        result = this.getVisualWithAlts(result, pos);

        if (!this.wallStitcheable(right)) result += 1;
        if (!this.wallStitcheable(left))  result += 2;
        return result;
    },

    getRaisedDoorTile(tile, below) {
        if (this.wallStitcheable(below)) {
            return 116; // RAISED_DOOR_SIDEWAYS
        } else if (tile === 5) { // Terrain.DOOR
            return 112; // RAISED_DOOR
        } else if (tile === 6) { // Terrain.OPEN_DOOR
            return 113; // RAISED_DOOR_OPEN
        } else if (tile === 10) { // Terrain.LOCKED_DOOR
            return 114; // RAISED_DOOR_LOCKED
        } else {
            return -1;
        }
    },

    stitchInternalWallTile(tile, right, rightBelow, below, leftBelow, left) {
        let result = 144; // WALL_INTERNAL

        if (!this.wallStitcheable(right))        result += 1;
        if (!this.wallStitcheable(rightBelow))   result += 2;
        if (!this.wallStitcheable(leftBelow))    result += 4;
        if (!this.wallStitcheable(left))         result += 8;
        return result;
    },

    stitchWallOverhangTile(tile, rightBelow, below, leftBelow) {
        let visual;
        if (tile === 6) { // Terrain.OPEN_DOOR
            visual = 208; // DOOR_SIDEWAYS_OVERHANG
        } else if (tile === 5) { // Terrain.DOOR
            visual = 212; // DOOR_SIDEWAYS_OVERHANG_CLOSED
        } else if (tile === 10) { // Terrain.LOCKED_DOOR
            visual = 216; // DOOR_SIDEWAYS_OVERHANG_LOCKED
        } else {
            visual = 192; // WALL_OVERHANG
        }

        if (!this.wallStitcheable(rightBelow)) visual += 1;
        if (!this.wallStitcheable(leftBelow))  visual += 2;

        return visual;
    },

    getTerrainVisual(tiles, pos, w, h) {
        const tile = tiles[pos];
        const DIRECT_VISUALS = {
            1: 0,   // EMPTY -> FLOOR
            2: 2,   // GRASS -> GRASS
            7: 16,  // ENTRANCE -> ENTRANCE
            8: 17,  // EXIT -> EXIT
            11: 0,  // TRAP -> FLOOR (trap drawn on top)
            13: 0,  // INACTIVE_TRAP -> FLOOR
        };

        // 1. Check direct visuals
        if (DIRECT_VISUALS[tile] !== undefined) {
            return this.getVisualWithAlts(DIRECT_VISUALS[tile], pos);
        }

        // 2. Water
        if (tile === 29) { // WATER
            const top = pos >= w ? tiles[pos - w] : -1;
            const right = (pos + 1) % w !== 0 ? tiles[pos + 1] : -1;
            const bottom = pos + w < tiles.length ? tiles[pos + w] : -1;
            const left = pos % w !== 0 ? tiles[pos - 1] : -1;
            return this.stitchWaterTile(top, right, bottom, left);
        }

        // 3. Chasm
        if (tile === 0) { // CHASM
            const above = pos >= w ? tiles[pos - w] : -1;
            return this.stitchChasmTile(above);
        }

        // 4. Doors
        if (this.doorTile(tile)) {
            const above = pos >= w ? tiles[pos - w] : -1;
            return this.getRaisedDoorTile(tile, above);
        }

        // 5. Walls
        if (this.wallStitcheable(tile)) {
            const right = (pos + 1) % w !== 0 ? tiles[pos + 1] : -1;
            const below = pos + w < tiles.length ? tiles[pos + w] : -1;
            const left = pos % w !== 0 ? tiles[pos - 1] : -1;
            return this.getRaisedWallTile(tile, pos, right, below, left);
        }

        return -1; // NULL_TILE
    },

    getWallVisual(tiles, pos, w, h) {
        const tile = tiles[pos];
        const below = pos + w < tiles.length ? tiles[pos + w] : -1;

        // 1. Wall tile
        if (this.wallStitcheable(tile)) {
            // If tile below is not a wall
            if (below !== -1 && !this.wallStitcheable(below)) {
                if (below === 5) return 227; // DOOR_SIDEWAYS (sideways door visual index in tiles_sewers.png)
                if (below === 10) return 228; // DOOR_SIDEWAYS_LOCKED
                if (below === 6) return -1;  // OPEN_DOOR -> NULL_TILE
                return -1; // Standard floor/water/chasm below wall -> NULL_TILE
            } else {
                // Inside wall structure
                const right = (pos + 1) % w !== 0 ? tiles[pos + 1] : -1;
                const rightBelow = (pos + 1) % w !== 0 && pos + w < tiles.length ? tiles[pos + 1 + w] : -1;
                const leftBelow = pos % w !== 0 && pos + w < tiles.length ? tiles[pos - 1 + w] : -1;
                const left = pos % w !== 0 ? tiles[pos - 1] : -1;
                return this.stitchInternalWallTile(tile, right, rightBelow, below, leftBelow, left);
            }
        }

        // 2. Overhangs above walls or doors
        if (below !== -1 && this.wallStitcheable(below)) {
            const rightBelow = (pos + 1) % w !== 0 ? tiles[pos + 1 + w] : -1;
            const leftBelow = pos % w !== 0 ? tiles[pos - 1 + w] : -1;
            return this.stitchWallOverhangTile(tile, rightBelow, below, leftBelow);
        }

        // 3. Overhangs above doors (pos+w is door)
        if (below === 5) return 224; // DOOR_OVERHANG
        if (below === 10) return 224; // DOOR_OVERHANG
        if (below === 6) return 225; // DOOR_OVERHANG_OPEN

        return -1;
    },

    // Precise sprite frame dimensions in sheets to avoid stretching
    FrameSizes: {
        warrior: { w: 12, h: 15 },
        mage: { w: 12, h: 15 },
        rogue: { w: 12, h: 15 },
        huntress: { w: 12, h: 15 },
        gnoll: { w: 12, h: 15 },
        rat: { w: 16, h: 15 },
        crab: { w: 16, h: 16 },
        eye: { w: 16, h: 16 },
        mimic: { w: 16, h: 16 },
        ghost: { w: 12, h: 15 },
        items: { w: 16, h: 16 },
        item_icons: { w: 16, h: 16 }
    },

    load(callback) {
        let total = Object.keys(this.assetList).length;
        let count = 0;
        
        for (let key in this.assetList) {
            let img = new Image();
            img.src = this.assetList[key];
            img.onload = () => {
                count++;
                if (count === total) {
                    this.loaded = true;
                    if (callback) callback();
                }
            };
            img.onerror = () => {
                console.error("Failed to load asset: " + this.assetList[key]);
                count++;
                if (count === total) {
                    this.loaded = true;
                    if (callback) callback();
                }
            };
            this.images[key] = img;
        }
    },

    // Draw a single tile from tileset
    drawTile(ctx, imageKey, tileIndex, dx, dy, dw, dh) {
        const img = this.images[imageKey];
        if (!img || img.width === 0) {
            // Fallback rendering
            ctx.fillStyle = (tileIndex === 48) ? '#2c3e50' : '#7f8c8d';
            ctx.fillRect(dx, dy, dw, dh);
            return;
        }
        
        const tilesPerRow = Math.floor(img.width / this.TILE_SIZE) || 1;
        const sx = (tileIndex % tilesPerRow) * this.TILE_SIZE;
        const sy = Math.floor(tileIndex / tilesPerRow) * this.TILE_SIZE;
        
        ctx.drawImage(img, sx, sy, this.TILE_SIZE, this.TILE_SIZE, dx, dy, dw, dh);
    },

    // Draw character sprite with correct offsets to prevent stretching/offset
    drawSprite(ctx, imageKey, frame, dx, dy, dw, dh, flipX = false) {
        const img = this.images[imageKey];
        if (!img || img.width === 0) {
            // Fallback rendering
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(dx + dw/2, dy + dh/2, dw/3, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        
        // Retrieve exact frame dimensions
        const size = this.FrameSizes[imageKey] || { w: 16, h: 16 };
        const frameW = size.w;
        const frameH = size.h;
        
        const framesPerRow = Math.floor(img.width / frameW) || 1;
        const sx = (frame % framesPerRow) * frameW;
        const sy = Math.floor(frame / framesPerRow) * frameH;
        
        // Align characters vertically: draw them offset slightly up since they are 15px high on a 16px grid
        const offsetY = Math.floor(((16 - frameH) / 16) * dh);
        
        ctx.save();
        if (flipX) {
            ctx.translate(dx + dw, dy + offsetY);
            ctx.scale(-1, 1);
            ctx.drawImage(img, sx, sy, frameW, frameH, 0, 0, dw, dh);
        } else {
            ctx.drawImage(img, sx, sy, frameW, frameH, dx, dy + offsetY, dw, dh);
        }
        ctx.restore();
    }
};
