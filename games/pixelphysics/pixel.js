import { GravityBehaviour, FluidBehaviour, PlantBehaviour, getBehaviour, FlammableBehaviour, BatteryPartBehaviour, WireBehaviour, LampBehaviour, SteamGeneratorBehaviour } from './behaviours.js';
export const DEFAULT_PIXEL = {
    name: 'air',
    colours: ['#ffffff'],
    thermalEnergy: 20,
    heatCapacity: 1,
    heatConductivity: 0.15,
    behaviours: []
};
export const pixelIds = {
    0: DEFAULT_PIXEL,
    1: { name: 'sand', colours: ['#d9a441', '#e8c56b', '#c89b45'], heatCapacity: 0.8, heatConductivity: 0.25, thermalEnergy: 16, meltingEnergy: 1200, meltingResult: 7, behaviours: [new GravityBehaviour(1)] },
    2: { name: 'water', colours: ['#0066cc', '#2389e8', '#6fc8ff'], heatCapacity: 4, heatConductivity: 0.45, thermalEnergy: 80, boilingEnergy: 400, boilingResult: 6, freezingEnergy: 0, freezingResult: 10, behaviours: [new FluidBehaviour(1, 1, 0)] },
    3: { name: 'wood', colours: ['#3b1f0b', '#6b3a17', '#8c5527'], heatCapacity: 1.6, heatConductivity: 0.08, thermalEnergy: 32, behaviours: [new FlammableBehaviour(300, 480, 4, 2)] },
    4: { name: 'fire', colours: ['#ff3300', '#ff9900', '#fff200'], heatCapacity: 0.5, heatConductivity: 0.8, thermalEnergy: 500, burnHeatProduction: 6, behaviours: [new FluidBehaviour(-1, 0, 0)] },
    5: { name: 'smoke', colours: ['#414141', '#7a7a7a', '#777777'], heatCapacity: 0.9, heatConductivity: 0.05, thermalEnergy: 120, behaviours: [new FluidBehaviour(-1, 0.02, 0)] },
    6: { name: 'steam', colours: ['#d9ffff', '#efffff', '#b8e8ff'], heatCapacity: 2.2, heatConductivity: 0.25, thermalEnergy: 260, freezingEnergy: 220, freezingResult: 2, behaviours: [new FluidBehaviour(-1, 0.01, 0)] },
    7: { name: 'glass', colours: ['#8de0d5'], heatCapacity: 0.9, heatConductivity: 0.35, thermalEnergy: 18, behaviours: [] },
    8: { name: 'oil', colours: ['#100d08', '#302010', '#57401f'], heatCapacity: 2.0, heatConductivity: 0.15, thermalEnergy: 40, behaviours: [new FluidBehaviour(1, 0.3, 0.2), new FlammableBehaviour(1500, 500, 4, 4)] },
    9: { name: 'fuse', colours: ['#555555', '#888888', '#bbbbbb'], heatCapacity: 0.5, heatConductivity: 0.15, thermalEnergy: 10, ignitionEnergy: 100, ignitionResult: 4, flammable: true, burnDuration: 1, burnHeatProduction: 50, behaviours: [] },
    10: { name: 'ice', colours: ['#75d8ff', '#b9eeff', '#e6ffff'], heatCapacity: 3.8, heatConductivity: 0.6, thermalEnergy: -38, meltingEnergy: 0, meltingResult: 2, behaviours: [] },
    11: { name: 'snow', colours: ['#ffffff', '#e8f5ff', '#c9e6ff'], heatCapacity: 2.0, heatConductivity: 0.25, thermalEnergy: -10, meltingEnergy: 0, meltingResult: 2, behaviours: [new GravityBehaviour(1)] },
    12: { name: 'cold void', colours: ['#000814', '#001d3d', '#003566'], heatCapacity: 10, heatConductivity: 1, thermalEnergy: -5000, passiveHeatProduction: -10, behaviours: [] },
    13: { name: 'plant', colours: ['#145214', '#278b27', '#63c957'], heatCapacity: 3.5, heatConductivity: 0.15, thermalEnergy: 70, behaviours: [new PlantBehaviour(), new FlammableBehaviour(100, 600, 4, 1)] },
    14: { name: 'lava', colours: ['#6b0000', '#d52b00', '#ff6a00'], heatCapacity: 0.5, heatConductivity: 0.8, thermalEnergy: 500, behaviours: [new FluidBehaviour(1, 10, 0), new FlammableBehaviour(Infinity, 0, 4, 20)] },
    15: { name: 'metal', colours: ['#8a8a8a'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new WireBehaviour()] },
    16: { name: 'air filter', colours: ['#151515'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [] },
    17: { name: 'battery', colours: ['#1100ff'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new BatteryPartBehaviour()] },
    18: { name: 'positive battery terminal', colours: ['#ff0000'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new BatteryPartBehaviour(), new WireBehaviour()] },
    19: { name: 'negative battery terminal', colours: ['#242424'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new BatteryPartBehaviour(), new WireBehaviour()] },
    20: { name: 'lamp', colours: ['#141414'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new LampBehaviour()] },
    21: { name: 'steam generator', colours: ['#141414'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [new SteamGeneratorBehaviour()] },
};
export class Pixel {
    id;
    colour;
    thermalEnergy;
    velocityX;
    nextId;
    behaviours;
    constructor(id) {
        const info = pixelIds[id] || DEFAULT_PIXEL;
        this.id = id;
        this.nextId = id;
        this.behaviours = this.info.behaviours.map(behaviour => behaviour.clone());
        this.colour = info.colours[randomInt(0, info.colours.length - 1)];
        this.thermalEnergy = info.thermalEnergy;
        this.velocityX = 0;
    }
    get info() {
        return pixelIds[this.id];
    }
    get temperature() {
        return this.thermalEnergy / this.info.heatCapacity;
    }
    clone() {
        const p = new Pixel(this.id);
        p.colour = this.colour;
        p.velocityX = this.velocityX;
        p.thermalEnergy = this.thermalEnergy;
        p.behaviours = this.behaviours.map(behaviour => behaviour.clone());
        return p;
    }
    updateInfo() {
        this.id = this.nextId;
        this.colour = this.info.colours[randomInt(0, this.info.colours.length - 1)];
        this.behaviours = this.info.behaviours.map(behaviour => behaviour.clone());
    }
}
export const interactions = {
    4: {
        1: (fire, firePos, sand, sandPos, current, next, grid) => {
            next[sandPos.y][sandPos.x] = new Pixel(7);
        },
        2: (fire, firePos, water, waterPos, current, next, grid) => {
            next[firePos.y][firePos.x] = new Pixel(6);
            next[waterPos.y][waterPos.x] = new Pixel(6);
        },
        3: (fire, firePos, wood, woodPos, current, next, grid) => {
            let nextWood = next[woodPos.y][woodPos.x];
            let flammableBehaviour = getBehaviour(nextWood, FlammableBehaviour);
            if (flammableBehaviour) {
                flammableBehaviour.burning = true;
            }
        },
        8: (fire, firePos, oil, oilPos, current, next, grid) => {
            let nextOil = next[oilPos.y][oilPos.x];
            let flammableBehaviour = getBehaviour(nextOil, FlammableBehaviour);
            if (flammableBehaviour) {
                flammableBehaviour.burning = true;
            }
        },
        9: (fire, firePos, fuse, fusePos, current, next, grid) => {
            next[fusePos.y][fusePos.x] = new Pixel(4);
            grid.updated[fusePos.y][fusePos.x] = true;
        }
    },
    16: {
        5: (filter, filterPos, smoke, smokePos, current, next, grid) => {
            next[smokePos.y][smokePos.x] = new Pixel(0);
            grid.updated[smokePos.y][smokePos.x] = true;
        }
    }
};
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
