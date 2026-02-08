export const CONFIG = {
    GAME_MODES: {
        HOME: 'home',    // Building your base
        ATTACK: 'attack'  // Attacking enemy base
    },
    BATTLE_TIME: 120, // seconds for attack
    GRID: {
        SIZE: 20,
        CELL_SIZE: 2,
    },
    BUILDINGS: {
        TOWN_HALL: {
            cost: 0,
            currency: 'gold',
            id: 'town-hall',
            label: 'Town Hall',
            size: 2,
            hp: 1000,
            texture: 'https://rosebud.ai/assets/building_wood_stone.webp?Zq34'
        },
        MINE: {
            cost: 100,
            currency: 'gold',
            id: 'mine',
            label: 'Gold Mine',
            size: 1,
            hp: 300,
            goldRate: 10, // Gold per 2 seconds
            texture: 'https://rosebud.ai/assets/gold-ingot.png?ZNUf'
        },
        BARRACKS: {
            cost: 200,
            currency: 'gold',
            id: 'barracks',
            label: 'Barracks',
            size: 1,
            hp: 400,
            elixirRate: 6, // Elixir per 2 seconds
            texture: 'https://rosebud.ai/assets/mine.png?xcdt'
        },
        ARCHER_TOWER: {
            cost: 150,
            currency: 'gold',
            id: 'archer-tower',
            label: 'Archer Tower',
            size: 1,
            hp: 500,
            damage: 3,
            range: 8,
            attackSpeed: 1000, // milliseconds between attacks
            texture: 'https://rosebud.ai/assets/castle-tower.png?8zwa'
        }
    },
    TROOPS: {
        BEAR: {
            id: 'bear',
            label: 'Bear',
            cost: 30,
            currency: 'elixir',
            hp: 100,
            damage: 20,
            speed: 0.05,
            range: 1.5,
            trainTime: 3, // seconds
            texture: 'https://rosebud.ai/assets/bear_troop.webp?zkRx'
        },
        RABBIT: {
            id: 'rabbit',
            label: 'Rabbit',
            cost: 15,
            currency: 'elixir',
            hp: 40,
            damage: 10,
            speed: 0.12,
            range: 5.0, // Medium range - can attack from behind Bears
            trainTime: 5, // seconds
            texture: 'https://rosebud.ai/assets/rabbit_troop.webp?bMEY'
        },
        PENGUIN: {
            id: 'penguin',
            label: 'Penguin Archer',
            cost: 50,
            currency: 'elixir',
            hp: 60,
            damage: 25,
            speed: 0.08,
            range: 10.0, // Long range - can attack from far away
            trainTime: 7, // seconds
            texture: 'https://rosebud.ai/assets/penguin.png?KU67'
        }
    },
    ENEMY_BASES: [
        // Base Layout 1 - Square fortress
        [
            { type: 'TOWN_HALL', x: 9, z: 9 },
            { type: 'ARCHER_TOWER', x: 6, z: 6 },
            { type: 'ARCHER_TOWER', x: 13, z: 6 },
            { type: 'ARCHER_TOWER', x: 6, z: 13 },
            { type: 'ARCHER_TOWER', x: 13, z: 13 },
            { type: 'MINE', x: 5, z: 10 },
            { type: 'MINE', x: 14, z: 10 },
            { type: 'BARRACKS', x: 10, z: 5 },
            { type: 'BARRACKS', x: 10, z: 14 }
        ],
        // Base Layout 2 - Diagonal defense
        [
            { type: 'TOWN_HALL', x: 10, z: 10 },
            { type: 'ARCHER_TOWER', x: 7, z: 7 },
            { type: 'ARCHER_TOWER', x: 13, z: 13 },
            { type: 'MINE', x: 5, z: 5 },
            { type: 'MINE', x: 15, z: 15 },
            { type: 'BARRACKS', x: 7, z: 13 },
            { type: 'BARRACKS', x: 13, z: 7 },
            { type: 'MINE', x: 10, z: 5 }
        ],
        // Base Layout 3 - Ring formation
        [
            { type: 'TOWN_HALL', x: 10, z: 10 },
            { type: 'ARCHER_TOWER', x: 10, z: 6 },
            { type: 'ARCHER_TOWER', x: 10, z: 14 },
            { type: 'ARCHER_TOWER', x: 6, z: 10 },
            { type: 'ARCHER_TOWER', x: 14, z: 10 },
            { type: 'MINE', x: 8, z: 8 },
            { type: 'MINE', x: 12, z: 12 },
            { type: 'BARRACKS', x: 8, z: 12 },
            { type: 'BARRACKS', x: 12, z: 8 }
        ]
    ],
    COLORS: {
        GROUND: 0x4caf50,
        GRID: 0x388e3c,
        VALID: 0x00ff00,
        INVALID: 0xff0000
    },
    ASSETS: {
        GRASS: 'https://rosebud.ai/assets/cartoon_grass.webp?Kjoj'
    }
};
