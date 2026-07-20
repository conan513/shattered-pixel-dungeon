// dungeon.js – Shattered Pixel Dungeon Web Co-op
// Implements an authentic grid-based level generator with A* corridor routing,
// specialized room types, and a ground items ("heaps") layer.

class Room {
    constructor(x, y, w, h, type = 'regular') {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.cx = Math.floor(x + w / 2);
        this.cy = Math.floor(y + h / 2);
        this.type = type; // 'regular' | 'pillar' | 'garden' | 'water' | 'chasm' | 'vault'
    }
}

class Heap {
    constructor(x, y, item) {
        this.x = x;
        this.y = y;
        this.item = item; // Item object
    }
}

class DungeonMap {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = new Array(width * height).fill(Assets.Terrain.WALL);
        this.visible = new Array(width * height).fill(false);
        this.discovered = new Array(width * height).fill(false);
        this.rooms = [];
        this.heaps = []; // Ground items
        this.stairsDown = { x: 0, y: 0 };
        this.stairsUp = { x: 0, y: 0 };
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return Assets.Terrain.WALL;
        return this.tiles[y * this.width + x];
    }

    setTile(x, y, val) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y * this.width + x] = val;
        }
    }

    isBlocked(x, y) {
        const tile = this.getTile(x, y);
        // Walls and closed/locked doors block movement; chasm blocks walking
        return tile === Assets.Terrain.WALL ||
               tile === Assets.Terrain.DOOR ||
               tile === Assets.Terrain.LOCKED_DOOR ||
               tile === Assets.Terrain.CHASM;
    }

    isOpaque(x, y) {
        const tile = this.getTile(x, y);
        return tile === Assets.Terrain.WALL ||
               tile === Assets.Terrain.DOOR ||
               tile === Assets.Terrain.LOCKED_DOOR;
    }

    resetVisibility() {
        this.visible.fill(false);
    }
}

// ─── A* Pathfinder for Corridor Carving ──────────────────────────────────────
// Guarantees clean routing that hugs walls and avoids cutting through existing rooms.
function findCorridorPath(map, startX, startY, endX, endY) {
    const w = map.width;
    const h = map.height;
    const dist = new Array(w * h).fill(Infinity);
    const parent = new Array(w * h).fill(null);

    dist[startY * w + startX] = 0;
    const openSet = [{ x: startX, y: startY, g: 0, f: Math.abs(endX - startX) + Math.abs(endY - startY) }];

    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const curr = openSet.shift();

        if (curr.x === endX && curr.y === endY) {
            const path = [];
            let p = curr.y * w + curr.x;
            while (p !== null) {
                path.push({ x: p % w, y: Math.floor(p / w) });
                p = parent[p];
            }
            path.reverse();
            return path;
        }

        const neighbors = [
            { x: curr.x - 1, y: curr.y },
            { x: curr.x + 1, y: curr.y },
            { x: curr.x, y: curr.y - 1 },
            { x: curr.x, y: curr.y + 1 }
        ];

        for (let n of neighbors) {
            if (n.x < 1 || n.x >= w - 1 || n.y < 1 || n.y >= h - 1) continue;

            const tile = map.getTile(n.x, n.y);
            let weight = 1.0;

            if (tile === Assets.Terrain.WALL) {
                weight = 1.2; // Standard corridor carving cost
            } else if (tile === Assets.Terrain.EMPTY) {
                weight = 15.0; // High penalty to avoid carving corridors inside existing rooms!
            } else {
                weight = 1.0; // Reuse existing corridor paths
            }

            const idx = n.y * w + n.x;
            const newG = curr.g + weight;

            if (newG < dist[idx]) {
                dist[idx] = newG;
                parent[idx] = curr.y * w + curr.x;
                const hVal = Math.abs(endX - n.x) + Math.abs(endY - n.y);
                openSet.push({ x: n.x, y: n.y, g: newG, f: newG + hVal });
            }
        }
    }
    return null;
}

// ─── Procedural Dungeon Generator ────────────────────────────────────────────
function generateDungeon(width = 36, height = 36) {
    const map = new DungeonMap(width, height);
    map.tiles.fill(Assets.Terrain.WALL);

    // 1. Grid Definition (3x3 grid layout)
    const gridW = 3;
    const gridH = 3;
    const cellW = Math.floor((width - 2) / gridW); // ~11-12 tiles
    const cellH = Math.floor((height - 2) / gridH);
    const rooms = [];

    // 2. Select special room types to disperse
    const specials = ['garden', 'water', 'chasm', 'pillar', 'vault'];
    let specIndex = 0;

    // Place a room in each grid cell (ensuring no overlaps)
    for (let gy = 0; gy < gridH; gy++) {
        for (let gx = 0; gx < gridW; gx++) {
            const cellX = 1 + gx * cellW;
            const cellY = 1 + gy * cellH;

            // Random room sizes (between 5 and cell size - 2)
            const rw = Math.floor(Math.random() * 4) + 5; // 5 to 8
            const rh = Math.floor(Math.random() * 4) + 5;

            // Random position offset within the cell bounds
            const rx = cellX + Math.floor(Math.random() * (cellW - rw - 1));
            const ry = cellY + Math.floor(Math.random() * (cellH - rh - 1));

            // Select type: Start/End cells are regular; others can be special
            let type = 'regular';
            const isStartCell = (gx === 0 && gy === 0);
            const isEndCell = (gx === gridW - 1 && gy === gridH - 1);

            if (!isStartCell && !isEndCell && Math.random() < 0.65 && specIndex < specials.length) {
                type = specials[specIndex++];
            }

            rooms.push(new Room(rx, ry, rw, rh, type));
        }
    }

    // 3. Connect rooms using a randomized Spanning Tree (to guarantee accessibility)
    const edges = [];
    for (let i = 0; i < rooms.length; i++) {
        const ix = i % gridW;
        const iy = Math.floor(i / gridW);

        // Connect right
        if (ix < gridW - 1) edges.push([i, i + 1]);
        // Connect down
        if (iy < gridH - 1) edges.push([i, i + gridW]);
    }

    const treeEdges = [];
    const visited = new Set([0]);
    while (visited.size < rooms.length) {
        const candidates = edges.filter(([u, v]) => 
            (visited.has(u) && !visited.has(v)) || (!visited.has(u) && visited.has(v))
        );
        if (candidates.length === 0) break;
        const edge = candidates[Math.floor(Math.random() * candidates.length)];
        treeEdges.push(edge);
        visited.add(edge[0]);
        visited.add(edge[1]);
    }

    // Add extra connections to create loops (loop builders)
    for (let edge of edges) {
        if (!treeEdges.some(([u, v]) => (u === edge[0] && v === edge[1]) || (u === edge[1] && v === edge[0]))) {
            if (Math.random() < 0.25) {
                treeEdges.push(edge);
            }
        }
    }

    // 4. Carve rooms
    for (let r of rooms) {
        if (r.type === 'garden') {
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) {
                    // Outer border grass, center high grass
                    if (rx === r.x || rx === r.x + r.w - 1 || ry === r.y || ry === r.y + r.h - 1) {
                        map.setTile(rx, ry, Assets.Terrain.GRASS);
                    } else {
                        map.setTile(rx, ry, Assets.Terrain.HIGH_GRASS);
                    }
                }
            }
        } else if (r.type === 'water') {
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.EMPTY);
                }
            }
            // Pond center
            for (let ry = r.y + 1; ry < r.y + r.h - 1; ry++) {
                for (let rx = r.x + 1; rx < r.x + r.w - 1; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.WATER);
                }
            }
        } else if (r.type === 'chasm') {
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.EMPTY);
                }
            }
            // Chasm center
            for (let ry = r.y + 2; ry < r.y + r.h - 2; ry++) {
                for (let rx = r.x + 2; rx < r.x + r.w - 2; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.CHASM);
                }
            }
        } else if (r.type === 'pillar') {
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.EMPTY);
                }
            }
            // Pillar in center
            if (r.w >= 6 && r.h >= 6) {
                map.setTile(r.x + 2, r.y + 2, Assets.Terrain.WALL);
                map.setTile(r.x + r.w - 3, r.y + 2, Assets.Terrain.WALL);
                map.setTile(r.x + 2, r.y + r.h - 3, Assets.Terrain.WALL);
                map.setTile(r.x + r.w - 3, r.y + r.h - 3, Assets.Terrain.WALL);
            } else {
                map.setTile(r.cx, r.cy, Assets.Terrain.WALL);
            }
        } else {
            // Regular or Vault
            for (let ry = r.y; ry < r.y + r.h; ry++) {
                for (let rx = r.x; rx < r.x + r.w; rx++) {
                    map.setTile(rx, ry, Assets.Terrain.EMPTY);
                }
            }
        }
    }

    // 5. Carve Corridors + collect doorway candidates
    // A "doorway" is any wall tile that the corridor carves, which immediately
    // borders a room interior on one side. We collect these per-room so we can
    // decide afterwards whether to place a door or an open passage.
    const doorwayCandidates = new Map(); // "x,y" -> { x, y, rooms: Set of room indices }

    function isInsideRoom(r, x, y) {
        return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
    }

    function isOnRoomBoundaryWall(r, x, y) {
        // The wall tile just outside a room border (one tile gap surrounding the room)
        const onLeft  = x === r.x - 1 && y >= r.y     && y < r.y + r.h;
        const onRight = x === r.x + r.w && y >= r.y   && y < r.y + r.h;
        const onTop   = y === r.y - 1 && x >= r.x     && x < r.x + r.w;
        const onBot   = y === r.y + r.h && x >= r.x   && x < r.x + r.w;
        return onLeft || onRight || onTop || onBot;
    }

    for (let [u, v] of treeEdges) {
        const r1 = rooms[u];
        const r2 = rooms[v];
        const path = findCorridorPath(map, r1.cx, r1.cy, r2.cx, r2.cy);

        if (path) {
            for (let pt of path) {
                if (map.getTile(pt.x, pt.y) === Assets.Terrain.WALL) {
                    map.setTile(pt.x, pt.y, Assets.Terrain.EMPTY);

                    // Check if this carved wall is on the boundary of room u or v
                    for (const [rIdx, room] of [[u, r1], [v, r2]]) {
                        if (isOnRoomBoundaryWall(room, pt.x, pt.y)) {
                            const key = `${pt.x},${pt.y}`;
                            if (!doorwayCandidates.has(key)) {
                                doorwayCandidates.set(key, { x: pt.x, y: pt.y, rooms: new Set() });
                            }
                            doorwayCandidates.get(key).rooms.add(rIdx);
                        }
                    }
                }
            }
        }
    }

    // 6. Place doors at exactly the carved boundary crossings
    for (const [, cand] of doorwayCandidates) {
        // Pick the most relevant room to decide door type
        let doorType = Assets.Terrain.DOOR;
        for (const rIdx of cand.rooms) {
            if (rooms[rIdx].type === 'vault') {
                doorType = Assets.Terrain.LOCKED_DOOR;
                break;
            }
        }
        map.setTile(cand.x, cand.y, doorType);
    }

    // 7. Place stairs
    const firstRoom = rooms[0];
    map.stairsUp = { x: firstRoom.cx, y: firstRoom.cy };
    map.setTile(map.stairsUp.x, map.stairsUp.y, Assets.Terrain.ENTRANCE);

    const lastRoom = rooms[rooms.length - 1];
    map.stairsDown = { x: lastRoom.cx, y: lastRoom.cy };
    map.setTile(map.stairsDown.x, map.stairsDown.y, Assets.Terrain.EXIT);

    // 8. Ground Heaps (spawning loot directly on floor)
    map.heaps = [];

    // If Vault room is generated, place a Chest heap inside and spawn a Golden Key in another room
    const vaultRoom = rooms.find(r => r.type === 'vault');
    if (vaultRoom) {
        // Vault chest drop heap (represented by chest index 36 from items.png)
        map.heaps.push(new Heap(vaultRoom.cx, vaultRoom.cy, new Item('potion', 'Healing Potion', 1, 352))); // Place rare loot in vault
        map.heaps.push(new Heap(vaultRoom.cx - 1, vaultRoom.cy, new Item('gold', 'Gold Pile', 40, 18)));

        // Golden Key drops in a random non-vault room
        const keyRoom = rooms.find(r => r.type === 'regular' && r !== firstRoom);
        if (keyRoom) {
            map.heaps.push(new Heap(keyRoom.cx, keyRoom.cy, new Item('key', 'Golden Key', 1, 90)));
        }
    }

    // Disperse random gold piles & food rations in regular rooms
    for (let r of rooms) {
        if (r.type === 'regular' && r !== firstRoom) {
            // Gold pile (35% chance)
            if (Math.random() < 0.35) {
                const amount = Math.floor(Math.random() * 12) + 5;
                map.heaps.push(new Heap(r.cx, r.cy, new Item('gold', 'Gold Pile', amount, 18)));
            }
            // Food ration (20% chance)
            else if (Math.random() < 0.20) {
                map.heaps.push(new Heap(r.x + 1, r.y + 1, new Item('food', 'Food Ration', 1, 32)));
            }
            // Potion (15% chance)
            else if (Math.random() < 0.15) {
                map.heaps.push(new Heap(r.x + r.w - 2, r.y + r.h - 2, new Item('potion', 'Healing Potion', 1, 352)));
            }
        }
    }

    map.rooms = rooms;
    return map;
}

// Raycasting visibility field logic
function computeFOV(map, startX, startY, maxRange = 8) {
    const step = 3;
    for (let angle = 0; angle < 360; angle += step) {
        let rad = (angle * Math.PI) / 180;
        let dx = Math.cos(rad);
        let dy = Math.sin(rad);

        let cx = startX + 0.5;
        let cy = startY + 0.5;

        for (let r = 0; r < maxRange; r++) {
            cx += dx;
            cy += dy;

            let tx = Math.floor(cx);
            let ty = Math.floor(cy);

            if (tx < 0 || tx >= map.width || ty < 0 || ty >= map.height) break;

            let idx = ty * map.width + tx;
            map.visible[idx] = true;
            map.discovered[idx] = true;

            if (map.isOpaque(tx, ty)) {
                break; // Hit wall or door
            }
        }
    }
}

// BFS shortest path search for monster chasing AI
function findPath(map, startX, startY, endX, endY) {
    const queue = [{ x: startX, y: startY, path: [] }];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    while (queue.length > 0) {
        const curr = queue.shift();

        if (curr.x === endX && curr.y === endY) {
            return curr.path;
        }

        const neighbors = [
            { x: curr.x, y: curr.y - 1 },
            { x: curr.x, y: curr.y + 1 },
            { x: curr.x - 1, y: curr.y },
            { x: curr.x + 1, y: curr.y }
        ];

        for (let n of neighbors) {
            const key = `${n.x},${n.y}`;
            if (!visited.has(key) && !map.isBlocked(n.x, n.y)) {
                visited.add(key);
                queue.push({ x: n.x, y: n.y, path: curr.path.concat([n]) });
            }
        }
    }
    return null;
}
