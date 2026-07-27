import { FluidBehaviour, getBehaviour, GravityBehaviour } from './behaviours.js'
import { DEFAULT_PIXEL, Pixel, interactions } from './pixel.js'

type Position = {
    x: number,
    y: number
}

export type Structure = {
    pixels: Position[]
    byId: Map<number, Position[]>
    owner: Position
}

// Change buffer system so that when things fall or rise they dont do so in alternating rows of air and the material
// Also so that sand can fall through water even if the water is still moving
// And other stuff like that that arises because of refusing to update already updating tiles

export class Grid {
    rows: number
    columns: number
    pixels: Array<Array<Pixel>>
    ambientTemperature: number

    private structureCache: Map<string, Structure>
    private structureKeyAt: Array<Array<string | undefined>>

    constructor(rows: number, columns: number) {
        this.rows = rows;
        this.columns = columns
        this.pixels = Array.from({ length: rows }, () => Array.from({ length: columns }, () => new Pixel(0)))
        this.ambientTemperature = 20
        this.nextGrid = this.pixels.map(row =>
            row.map(pixel => pixel.clone())
        )
        this.updated = Array.from(
            { length: this.rows },
            () => Array(this.columns).fill(false)
        )

        this.structureCache = new Map()
        this.structureKeyAt = Array.from(
            { length: rows },
            () => Array<string | undefined>(columns).fill(undefined)
        )
    }

    nextGrid: Pixel[][]
    updated: boolean[][]

    updatePixels() {
        this.nextGrid = this.pixels.map(row =>
            row.map(pixel => pixel.clone())
        )
        this.updated = Array.from(
            { length: this.rows },
            () => Array(this.columns).fill(false)
        )
        this.structureCache.clear()
        for (let y = 0; y < this.rows; y++) {
            this.structureKeyAt[y].fill(undefined)
        }

        // Falling / static pixels: bottom-to-top so vacancies propagate downward correctly
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = this.columns - 1; x >= 0; x--) {
                let pixel = this.pixels[y][x]
                let fluidBehaviour = getBehaviour(pixel, FluidBehaviour)
                let gravityBehaviour = getBehaviour(pixel, GravityBehaviour)
                if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
                    gravityBehaviour = fluidBehaviour.gravityBehaviour
                }
                
                if (gravityBehaviour && gravityBehaviour.gravity < 0) continue
                this.processPixel(x, y)
            }
        }

        // Rising pixels: top-to-bottom so vacancies propagate upward correctly
        for (let y = 0; y < this.rows; y++) {
            for (let x = this.columns - 1; x >= 0; x--) {
                let pixel = this.pixels[y][x]
                let fluidBehaviour = getBehaviour(pixel, FluidBehaviour)
                let gravityBehaviour = getBehaviour(pixel, GravityBehaviour)
                if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
                    gravityBehaviour = fluidBehaviour.gravityBehaviour
                }
                
                if (gravityBehaviour && gravityBehaviour.gravity >= 0 || !gravityBehaviour) continue
                this.processPixel(x, y)
            }
        }

        this.updateHeat(this.nextGrid)

        this.pixels = this.nextGrid
    }

    private processPixel(x: number, y: number) {
        let pixel: Pixel = this.pixels[y]![x]!

        if (this.updated[y][x]) return

        let pastInteractions: Record<number, Record<number, boolean>> = {}

        if (interactions[pixel.id]) {
            const neighbours = this.getNeighbours(x, y)

            for (const neighbour of neighbours) {
                const neighbourPixel = this.nextGrid[neighbour.y][neighbour.x]
                const interaction = interactions[pixel.id][neighbourPixel.id]

                if (interaction) {
                    if (!pastInteractions[pixel.id]) {
                        pastInteractions[pixel.id] = {}
                    }
                    pastInteractions[pixel.id][neighbourPixel.id] = true
                    interaction(
                        pixel,
                        { x, y },
                        neighbourPixel,
                        neighbour,
                        this.pixels,
                        this.nextGrid,
                        this
                    )
                }
            }
        }

        if (
            pixel.id == 4 &&
            !(pastInteractions[4] && pastInteractions[4][3])
        ) {
            if (Math.random() < 0.2) {
                let heat = pixel.thermalEnergy
                this.nextGrid[y][x] = new Pixel(5)
                this.nextGrid[y][x].thermalEnergy = heat
                this.updated[y][x] = true
                return
            }
        }

        let fluidBehaviour = getBehaviour(pixel, FluidBehaviour)
        let gravityBehaviour = getBehaviour(pixel, GravityBehaviour)
        if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
            gravityBehaviour = fluidBehaviour.gravityBehaviour
        }

        for (const behaviour of pixel.behaviours) {
            behaviour.update(pixel, {x: x, y: y}, this)
        }

        if (pixel.nextId != pixel.id) {
            pixel.id = pixel.nextId
            pixel.updateInfo()
        }
    }

    getStructure(origin: Position, structureIds: Set<number>): Structure {
        const cachedKey = this.structureKeyAt[origin.y][origin.x]
        if (cachedKey) {
            const cached = this.structureCache.get(cachedKey)
            if (cached) return cached
        }

        const pixels = this.floodFill(origin, p => structureIds.has(p.id))
        if (pixels.length === 0) {
            return {
                pixels: [],
                byId: new Map(),
                owner: origin
            }
        }

        const byId = new Map<number, Position[]>()
        let owner = pixels[0]

        for (const pos of pixels) {
            const id = this.nextGrid[pos.y][pos.x].id

            let list = byId.get(id)
            if (!list) {
                list = []
                byId.set(id, list)
            }
            list.push(pos)

            if (
                pos.y < owner.y ||
                (pos.y === owner.y && pos.x < owner.x)
            ) {
                owner = pos
            }
        }

        const key = `${owner.x},${owner.y}`
        const structure = { pixels, byId, owner }

        this.structureCache.set(key, structure)
        for (const pos of pixels) {
            this.structureKeyAt[pos.y][pos.x] = key
        }

        return structure
    }

    floodFill(
        origin: Position,
        canVisit: (pixel: Pixel) => boolean
    ): Position[] {
        const queue: Position[] = [origin]
        const visited = new Set<string>()
        const result: Position[] = []

        let head = 0
        while (head < queue.length) {
            const front = queue[head++]
            const key = `${front.x},${front.y}`

            if (visited.has(key)) continue
            visited.add(key)

            if (!canVisit(this.nextGrid[front.y][front.x])) {
                continue
            }

            result.push(front)
            queue.push(...this.getAdjacent(front.x, front.y))
        }

        return result
    }



    move(oldX: number, oldY: number, newX: number, newY: number) {
        const movingPixel = this.nextGrid[oldY][oldX];
        const displacedPixel = this.nextGrid[newY][newX];

        this.nextGrid[newY][newX] = movingPixel;
        this.nextGrid[oldY][oldX] = displacedPixel;

        this.updated[oldY][oldX] = true;
        this.updated[newY][newX] = true;
    }

    private updateHeat(nextGrid: Pixel[][]) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                const pixel = this.nextGrid[y][x]

                if (pixel.fixedThermalEnergy) {
                    pixel.thermalEnergy = pixel.fixedThermalEnergy
                }

                const neighbours = [
                    [x + 1, y],
                    [x, y + 1]
                ]

                for (const [nx, ny] of neighbours) {
                    if (!this.inBounds(nx, ny)) continue

                    this.transferHeat(
                        pixel,
                        this.nextGrid[ny][nx]
                    )
                }

                pixel.thermalEnergy += (this.ambientTemperature - pixel.temperature) * 0.001 * pixel.info.heatConductivity

                if (pixel.info.boilingEnergy != undefined && pixel.thermalEnergy > pixel.info.boilingEnergy) {
                    pixel.nextId = pixel.info.boilingResult!
                    pixel.updateInfo()
                }

                if (pixel.info.freezingEnergy != undefined && pixel.thermalEnergy < pixel.info.freezingEnergy) {
                    pixel.nextId = pixel.info.freezingResult!
                    pixel.updateInfo()
                }

                if (pixel.info.meltingEnergy != undefined && pixel.thermalEnergy > pixel.info.meltingEnergy) {
                    pixel.nextId = pixel.info.meltingResult!
                    pixel.updateInfo()
                }
            }
        }
    }

    private transferHeat(a: Pixel, b: Pixel) {
        const tempA = a.temperature
        const tempB = b.temperature

        const difference = tempA - tempB

        const conductivity =
            (a.info.heatConductivity + b.info.heatConductivity) / 2

        const energy =
            difference * conductivity * 0.01

        a.thermalEnergy -= energy
        b.thermalEnergy += energy
    }

    isClear(x: number, y: number) {
        if (this.nextGrid[y][x].id != 0) return false
        return this.pixels[y][x].id == 0 || this.updated[y][x]
    }

    inBounds(x: number, y: number) {
        return x >= 0 && y >= 0 && x < this.columns && y < this.rows
    }

    getNeighbours(x: number, y: number): Array<Position> {
        let neighbours: Array<Position> = []
        for (let xOff = -1; xOff <= 1; xOff++) {
            for (let yOff = -1; yOff <= 1; yOff++) {
                if (xOff == 0 && yOff == 0 || !this.inBounds(x + xOff, y + yOff)) continue
                neighbours.push({x: x + xOff, y: y + yOff})
            }
        }
        return neighbours
    }


    getAdjacent(x: number, y: number): Array<Position> {
        let neighbours: Array<Position> = []
        for (let xOff = -1; xOff <= 1; xOff++) {
            for (let yOff = -1; yOff <= 1; yOff++) {
                if (xOff == 0 && yOff == 0 || !this.inBounds(x + xOff, y + yOff) || (xOff == 0) == (yOff == 0)) continue
                neighbours.push({x: x + xOff, y: y + yOff})
            }
        }
        return neighbours
    }

    getRow(y: number): Array<Position> {
        let row: Array<Position> = []
        for (let x = 0; x < this.columns; x++) {
            row.push({x: x, y: y})
        }

        return row
    }

    getFluidDirections(x: number, y: number, gravityDirection: number): Array<number> {
        let leftDistance = this.getFlowDistance(x, y, -1, gravityDirection)
        let rightDistance = this.getFlowDistance(x, y, 1, gravityDirection)

        if (leftDistance < rightDistance) {
            return [-1, 1]
        } else if (rightDistance < leftDistance) {
            return [1, -1]
        }

        // Equal distance, pick a random preference
        return Math.random() < 0.5 ? [-1, 1] : [1, -1]
    }

    getFlowDistance(x: number, y: number, side: number, gravityDirection: number): number {
        let score = 0

        for (let i = 1; i < 20; i++) {
            let newX = x + side * i

            if (newX < 0 || newX >= this.columns)
                break

            // open horizontal space
            if (this.isEmptyForFluid(this.nextGrid[y][newX])) {
                score += 1
            }

            // a place where fluid can actually fall
            if (
                y + gravityDirection >= 0 &&
                y + gravityDirection < this.rows &&
                this.isEmptyForFluid(this.nextGrid[y + gravityDirection][newX])
            ) {
                score += 100
            }

            // reward deeper drops
            if (
                y + gravityDirection * 2 >= 0 &&
                y + gravityDirection * 2 < this.rows &&
                this.isEmptyForFluid(this.nextGrid[y + gravityDirection * 2][newX])
            ) {
                score += 200
            }
        }

        return score
    }

    canFlow(x: number, y: number, side: number, gravityDirection: number): boolean {
        for (let i = 1; i <= this.columns; i++) {
            let checkX = x + side * i;
            let nextY = y + gravityDirection

            if (!this.inBounds(checkX, nextY) || !this.inBounds(checkX, y) || !this.inBounds(x, nextY) || !this.inBounds(x, y))
                return false

            // blocked horizontally
            if (!this.isEmptyForFluid(this.nextGrid[y][checkX]) && this.nextGrid[y][checkX].id != this.nextGrid[y][x].id)
                return false;

            // can fall here
            if (this.isEmptyForFluid(this.nextGrid[nextY][checkX]))
                return true;
        }

        return false;
    }

    isGas(pixel: Pixel) {
        const fluid = getBehaviour(pixel, FluidBehaviour)
        return fluid !== undefined && fluid.gravityBehaviour.gravity < 0
    }

    isFluid(pixel: Pixel) {
        return getBehaviour(pixel, FluidBehaviour) != undefined
    }

    isEmptyForFluid(pixel: Pixel) {
        return pixel.id == 0 || this.isGas(pixel) || pixel.id == 4
    }
}