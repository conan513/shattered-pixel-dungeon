const HERO_CLASSES = {
    warrior: {
        name: "Warrior",
        maxHp: 28,
        baseDmg: 6,
        sprite: "warrior",
        desc: "High health, robust defense, starts with a worn shortsword.",
        weapon: "Worn Shortsword",
        weaponSprite: 96,
        armor: "Cloth Armor",
        armorSprite: 176
    },
    mage: {
        name: "Mage",
        maxHp: 18,
        baseDmg: 4,
        sprite: "mage",
        desc: "Casts spells, regenerates shielding, starts with a magic staff.",
        weapon: "Mage's Staff",
        weaponSprite: 101,
        armor: "Cloth Armor",
        armorSprite: 176
    },
    rogue: {
        name: "Rogue",
        maxHp: 22,
        baseDmg: 5,
        sprite: "rogue",
        desc: "High evasion, moves silently, starts with a sharp dagger.",
        weapon: "Dagger",
        weaponSprite: 100,
        armor: "Cloth Armor",
        armorSprite: 176
    },
    huntress: {
        name: "Huntress",
        maxHp: 16,
        baseDmg: 3,
        sprite: "huntress",
        desc: "Excellent vision, high critical hits, starts with a spirit bow.",
        weapon: "Spirit Bow",
        weaponSprite: 144,
        armor: "Cloth Armor",
        armorSprite: 176
    }
};

const MOB_TYPES = {
    rat: {
        name: "Sewer Rat",
        maxHp: 7,
        dmg: 2,
        sprite: "rat",
        xp: 2
    },
    crab: {
        name: "Giant Crab",
        maxHp: 12,
        dmg: 3,
        sprite: "crab",
        xp: 5
    },
    gnoll: {
        name: "Gnoll Scout",
        maxHp: 18,
        dmg: 5,
        sprite: "gnoll",
        xp: 9
    },
    eye: {
        name: "Evil Eye",
        maxHp: 26,
        dmg: 7,
        sprite: "eye",
        xp: 15
    }
};

class Entity {
    constructor(x, y, spriteKey, name) {
        this.x = x;
        this.y = y;
        // Smooth rendered position (interpolated each frame toward x/y)
        this.renderX = x;
        this.renderY = y;
        this.moveSpeed = 9; // tiles per second – completes in ~111ms, under the 180ms cooldown
        this.spriteKey = spriteKey;
        this.name = name;
        this.flipX = false;
        this.frame = 0;
        this.frameTimer = 0;
        this.animState = 'idle'; // 'idle' | 'walk' | 'attack' | 'die'
    }

    // Call every frame to glide renderX/Y toward the logical grid position
    updateRenderPos(dt) {
        const dx = this.x - this.renderX;
        const dy = this.y - this.renderY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.005) {
            this.renderX = this.x;
            this.renderY = this.y;
            // Snap back to idle once movement completes
            if (this.animState === 'walk') this.animState = 'idle';
        } else {
            const step = this.moveSpeed * dt;
            if (step >= dist) {
                this.renderX = this.x;
                this.renderY = this.y;
                if (this.animState === 'walk') this.animState = 'idle';
            } else {
                this.renderX += (dx / dist) * step;
                this.renderY += (dy / dist) * step;
            }
        }
    }

    updateAnimation(dt) {
        this.frameTimer += dt;
        
        let frames = [0];
        let delay = 0.25;
        
        if (this.animState === 'idle') {
            // HeroSprite.java loops between frame 0 and 1
            frames = [0, 0, 0, 1]; 
            delay = 0.3;
        } else if (this.animState === 'walk') {
            // Walking frames: 2 to 7
            frames = [2, 3, 4, 5, 6, 7];
            delay = 0.08;
        } else if (this.animState === 'attack') {
            // Attacking frames: 13, 14, 15, then switches back to idle
            frames = [13, 14, 15, 0];
            delay = 0.07;
        } else if (this.animState === 'die') {
            // Death frames: 8, 9, 10, 11, 12
            frames = [8, 9, 10, 11, 12];
            delay = 0.15;
        }

        if (this.frameTimer > delay) {
            this.frameTimer = 0;
            
            // Advance frame index
            let currentIdx = frames.indexOf(this.frame);
            if (currentIdx === -1) {
                this.frame = frames[0];
            } else {
                let nextIdx = currentIdx + 1;
                if (nextIdx >= frames.length) {
                    if (this.animState === 'attack') {
                        this.animState = 'idle'; // Reset back to idle
                        this.frame = 0;
                    } else if (this.animState === 'die') {
                        this.frame = frames[frames.length - 1]; // Stay dead on last frame
                    } else {
                        this.frame = frames[0];
                    }
                } else {
                    this.frame = frames[nextIdx];
                }
            }
        }
    }
}

class Player extends Entity {
    constructor(x, y, characterClass, name) {
        const stats = HERO_CLASSES[characterClass] || HERO_CLASSES.warrior;
        super(x, y, stats.sprite, name);
        this.classKey = characterClass;
        this.maxHp = stats.maxHp;
        this.hp = stats.maxHp;
        this.baseDmg = stats.baseDmg;
        this.level = 1;
        this.xp = 0;
        this.gold = 0;
        this.inventory = [];
        this.weapon = stats.weapon;
        this.weaponSprite = stats.weaponSprite;
        this.armor = stats.armor;
        this.armorSprite = stats.armorSprite;
        this.cooldown = 0;
        this.isDead = false;
        this.hunger = 100;     // 0-100: 100=well_fed, 33-66=hungry, 0-33=starving
        this.regenTimer = 0;   // turns until next HP regen tick
        this.lastDamageTurn = -99; // track last turn damage was taken
        this.turnCount = 0;    // total turns taken

        // Starting weapons and armor added to inventory
        this.inventory.push(new Item('weapon', stats.weapon, 1, stats.weaponSprite));
        this.inventory.push(new Item('armor', stats.armor, 1, stats.armorSprite));

        // Healing Potions (index 352) & Map Scrolls (index 304) & Food Ration (index 32)
        this.inventory.push(new Item('potion', 'Healing Potion', 2, 352));
        this.inventory.push(new Item('scroll', 'Scroll of Magic Map', 1, 304));
        this.inventory.push(new Item('food', 'Food Ration', 2, 32));
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        this.lastDamageTurn = this.turnCount;
        if (this.hp <= 0) {
            this.isDead = true;
            this.animState = 'die';
        }
        return amount;
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
        this.isDead = false;
        this.animState = 'idle';
    }

    /** Hunger state: 'well_fed' | 'hungry' | 'starving' */
    get hungerState() {
        if (this.hunger > 66) return 'well_fed';
        if (this.hunger > 20) return 'hungry';
        return 'starving';
    }

    gainXp(amount) {
        this.xp += amount;
        const xpNeeded = this.level * 10;
        if (this.xp >= xpNeeded) {
            this.xp -= xpNeeded;
            this.level++;
            this.maxHp += 4;
            this.hp = this.maxHp;
            return true; // Leveled up
        }
        return false;
    }
}

class Mob extends Entity {
    constructor(x, y, mobType) {
        const stats = MOB_TYPES[mobType] || MOB_TYPES.rat;
        super(x, y, stats.sprite, stats.name);
        this.type = mobType;
        this.maxHp = stats.maxHp;
        this.hp = stats.maxHp;
        this.dmg = stats.dmg;
        this.xp = stats.xp;
        this.state = 'idle';
        this.isDead = false;
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        this.animState = 'walk'; // Trigger flash animation
        if (this.hp <= 0) {
            this.isDead = true;
            this.animState = 'die';
        }
        return amount;
    }
}

class Item {
    constructor(type, name, amount = 1, spriteIndex = 0) {
        this.type = type; // 'gold' | 'potion' | 'scroll' | 'weapon' | 'armor'
        this.name = name;
        this.amount = amount;
        this.spriteIndex = spriteIndex; // Coordinate slice index on items.png
    }
}
