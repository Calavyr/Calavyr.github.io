import { Grid } from './grid.js'
import { PixelBehaviour, GravityBehaviour, FluidBehaviour, PlantBehaviour, getBehaviour, FlammableBehaviour } from './behaviours.js'

type Position = {
    x: number,
    y: number
}

export type PixelInfo = {
    name: string,
    colours: Array<string>,
    thermalEnergy: number,
    heatCapacity: number,
    heatConductivity: number,
    
    passiveHeatProduction?: number,

    flammable?: boolean,
    burning?: boolean,
    burnDuration?: number,
    ignitionEnergy?: number,
    ignitionResult?: number,
    burnHeatProduction?: number,

    freezingEnergy?: number,
    freezingResult?: number,

    meltingEnergy?: number,
    meltingResult?: number,

    boilingEnergy?: number,
    boilingResult?: number,

    behaviours: PixelBehaviour[]
}

export const DEFAULT_PIXEL: PixelInfo = {
    name: 'air',
    colours: ['#ffffff'],
    thermalEnergy: 20,
    heatCapacity: 1,
    heatConductivity: 0.15,
    behaviours: []
}

export const pixelIds: Record<number, PixelInfo> = {
    0: DEFAULT_PIXEL,
    1: { name: 'sand', colours: ['#ffd752', '#ffe387', '#e9d79b'], heatCapacity: 0.8, heatConductivity: 0.25, thermalEnergy: 16, meltingEnergy: 1200, meltingResult: 7, behaviours: [new GravityBehaviour(1)] },
    2: { name: 'water', colours: ['#2b8cff', '#4fb3ff', '#8ed8ff'], heatCapacity: 4, heatConductivity: 0.45, thermalEnergy: 80, boilingEnergy: 400, boilingResult: 6, freezingEnergy: 0, freezingResult: 10, behaviours: [new FluidBehaviour(1, 1, 0)] },
    3: { name: 'wood', colours: ['#3d2100', '#382200', '#553000'], heatCapacity: 1.6, heatConductivity: 0.08, thermalEnergy: 32, behaviours: [new FlammableBehaviour(300, 480, 4, 2)] },
    4: { name: 'fire', colours: ['#c00e0e', '#ee9209', '#ffbf10'], heatCapacity: 0.5, heatConductivity: 0.8, thermalEnergy: 500, burnHeatProduction: 6, behaviours: [new FluidBehaviour(-1, 0, 0)] },
    5: { name: 'smoke', colours: ['#414141', '#6b6b6b', '#9e9d9d'], heatCapacity: 0.9, heatConductivity: 0.05, thermalEnergy: 120, behaviours: [new FluidBehaviour(-1, 0.02, 0)] },
    6: { name: 'steam', colours: ['#e4fffa'], heatCapacity: 2.2, heatConductivity: 0.25, thermalEnergy: 260, freezingEnergy: 220, freezingResult: 2, behaviours: [new FluidBehaviour(-1, 0.01, 0)] },
    7: { name: 'glass', colours: ['#e3fffa'], heatCapacity: 0.9, heatConductivity: 0.35, thermalEnergy: 18, behaviours: [] },
    8: { name: 'oil', colours: ['#000000'], heatCapacity: 2.0, heatConductivity: 0.15, thermalEnergy: 40, behaviours: [new FluidBehaviour(1, 0.3, 0.2), new FlammableBehaviour(1500, 500, 4, 4)] },
    9: { name: 'fuse', colours: ['#929292'], heatCapacity: 0.5, heatConductivity: 0.15, thermalEnergy: 10, ignitionEnergy: 100, ignitionResult: 4, flammable: true, burnDuration: 1, burnHeatProduction: 50, behaviours: [] },
    10: { name: 'ice', colours: ['#b8e8ff', '#d8f5ff', '#f5ffff'], heatCapacity: 3.8, heatConductivity: 0.6, thermalEnergy: -38, meltingEnergy: 0, meltingResult: 2, behaviours: [] },
    11: { name: 'snow', colours: ['#ffffff', '#eaf7ff', '#ccecff'], heatCapacity: 2.0, heatConductivity: 0.25, thermalEnergy: -10, meltingEnergy: 0, meltingResult: 2, behaviours: [new GravityBehaviour(1)] },
    12: { name: 'cold void', colours: ['#001219', '#005f73', '#94d2bd'], heatCapacity: 10, heatConductivity: 1, thermalEnergy: -5000, passiveHeatProduction: -10, behaviours: [] },
    13: { name: 'plant', colours: ['#2e7d32', '#388e3c', '#43a047', '#66bb6a'], heatCapacity: 3.5, heatConductivity: 0.15, thermalEnergy: 70, behaviours: [new PlantBehaviour(), new FlammableBehaviour(100, 600, 4, 1)] },
    14: { name: 'lava', colours: ['#c00e0e', '#ee9209', '#ffbf10'], heatCapacity: 0.5, heatConductivity: 0.8, thermalEnergy: 500, behaviours: [new FluidBehaviour(1, 10, 0), new FlammableBehaviour(Infinity, 0, 4, 10)] },
    15: { name: 'metal', colours: ['#7a7a7a', '#9b9b9b', '#c0c0c0'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [] },
    16: { name: 'air filter', colours: ['#3d3d3d'], heatCapacity: 3.5, heatConductivity: 0.9, thermalEnergy: 70, behaviours: [] }
}

export class Pixel {
    id: number
    colour: string
    thermalEnergy: number
    velocityX: number

    nextId: number

    behaviours: PixelBehaviour[]

    constructor(id: number) {
        const info = pixelIds[id] || DEFAULT_PIXEL

        this.id = id
        this.nextId = id

        this.behaviours = this.info.behaviours.map(
            behaviour => behaviour.clone()
        )
       
        this.colour = info.colours[randomInt(0, info.colours.length - 1)]

        this.thermalEnergy = info.thermalEnergy

        this.velocityX = 0
    }

    get info(): PixelInfo {
        return pixelIds[this.id]
    }

    get temperature(): number {
        return this.thermalEnergy / this.info.heatCapacity
    }

    clone(): Pixel {
        const p = new Pixel(this.id)
        p.colour = this.colour
        p.velocityX = this.velocityX
        p.thermalEnergy = this.thermalEnergy
        p.behaviours  = this.behaviours.map(
            behaviour => behaviour.clone()
        )
        return p
    }

    updateInfo() {
        this.id = this.nextId
        this.colour = this.info.colours[randomInt(0, this.info.colours.length - 1)]
        this.behaviours = this.info.behaviours.map(
            behaviour => behaviour.clone()
        )
    }
}

export type Interaction = (
    self: Pixel,
    selfPos: Position,
    other: Pixel,
    otherPos: Position,
    current: Pixel[][],
    next: Pixel[][],
    grid: Grid
) => void

export const interactions: Record<number, Record<number, Interaction>> = {
    4: {
        1: (fire, firePos, sand, sandPos, current, next, grid) => {
            next[sandPos.y][sandPos.x] = new Pixel(7)
        },

        2: (fire, firePos, water, waterPos, current, next, grid) => {
            next[firePos.y][firePos.x] = new Pixel(6)
            next[waterPos.y][waterPos.x] = new Pixel(6)
        },

        3: (fire, firePos, wood, woodPos, current, next, grid) => {
            let nextWood = next[woodPos.y][woodPos.x]
            let flammableBehaviour = getBehaviour(nextWood, FlammableBehaviour)
            if (flammableBehaviour) {
                flammableBehaviour!.burning = true
            }
        },

        8: (fire, firePos, oil, oilPos, current, next, grid) => {
            let nextOil = next[oilPos.y][oilPos.x]
            let flammableBehaviour = getBehaviour(nextOil, FlammableBehaviour)
            if (flammableBehaviour) {
                flammableBehaviour!.burning = true
            }
        },

        9: (fire, firePos, fuse, fusePos, current, next, grid) => {
            next[fusePos.y][fusePos.x] = new Pixel(4)
            grid.updated[fusePos.y][fusePos.x] = true
        }
    },
    16: {
        5: (filter, filterPos, smoke, smokePos, current, next, grid) => {
            next[smokePos.y][smokePos.x] = new Pixel(0)
            grid.updated[smokePos.y][smokePos.x] = true
        }
    }
}

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}