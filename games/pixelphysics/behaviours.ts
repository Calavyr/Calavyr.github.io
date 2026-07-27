import { Grid } from './grid.js'
import { Pixel, pixelIds, PixelInfo } from './pixel.js'

type Position = {
    x: number,
    y: number
}

export interface PixelBehaviour {
    update(pixel: Pixel, pixelPos: Position, grid: Grid): void;
    clone(): PixelBehaviour;
}

type Structure = {
    pixels: Position[]
    byId: Map<number, Position[]>
}

export abstract class StructureBehaviour implements PixelBehaviour {
    abstract structureType: string
    abstract structureIds: Set<number>

    getStructure(pixelPos: Position, grid: Grid): Structure {
        const pixels = floodFill(
            pixelPos,
            grid,
            p => this.structureIds.has(p.id)
        )

        const byId = new Map<number, Position[]>()

        for (const pos of pixels) {
            const id = grid.nextGrid[pos.y][pos.x].id

            if (!byId.has(id)) {
                byId.set(id, [])
            }

            byId.get(id)!.push(pos)
        }

        return {
            pixels,
            byId
        }
    }

    getStructureOwner(structure: Structure): Position {
        let owner = structure.pixels[0]

        for (const pos of structure.pixels) {
            if (
                pos.y < owner.y ||
                (pos.y === owner.y && pos.x < owner.x)
            ) {
                owner = pos
            }
        }

        return owner
    }

    abstract update(pixel: Pixel, pixelPos: Position, grid: Grid): void
    abstract clone(): PixelBehaviour
}

export interface PowerSource {
    voltage: number
    get current(): number
}

export class BatteryPartBehaviour extends StructureBehaviour implements PowerSource {
    structureType: string = "battery"
    structureIds: Set<number> = new Set([17, 18, 19])

    energy = 10000
    maxEnergy = 10000
    voltage = 12
    resistance = 0.1

    get current() {
        return this.energy > 0 ? Infinity : 0
    }

    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        if (this.energy <= 0) {
            return
        }

        const structure = this.getStructure(pixelPos, grid)

        if (this.getStructureOwner(structure) != pixelPos) {
            return
        }

        const body = structure.byId.get(17) ?? []
        const positive = structure.byId.get(18) ?? []
        const negative = structure.byId.get(19) ?? []

        if (positive.length == 0 || negative.length == 0) {
            return
        }

        
        const circuit = findCircuit(
            positive[0],
            negative[0],
            grid
        )

        if (!circuit.reachesOtherTerminal) return

        let currentDraw = 0

        for (const pos of circuit.pixels) {
            const pixel = grid.nextGrid[pos.y][pos.x]
            

            const electrical = getBehaviour(pixel, ElectricalBehaviour)

            if (!electrical) continue
            
            electrical.voltage = Math.max(this.voltage, electrical.voltage)
            electrical.powered = true
            currentDraw += electrical.current
        }

        this.energy -= currentDraw * 0.01

        if (this.energy < 0) {
            this.energy = 0
        }
    }

    clone() {
        const copy = new BatteryPartBehaviour()
        copy.energy = this.energy
        return copy
    }
}

export abstract class ElectricalBehaviour implements PixelBehaviour {
    voltage = 0
    powered = false
    resistance = 1

    get current() {
        if (!this.powered) return 0
        return this.voltage / this.resistance
    }

    canTransferTo(other: ElectricalBehaviour): boolean {
        return false
    }

    abstract update(pixel: Pixel, pixelPos: Position, grid: Grid): void
    abstract clone(): PixelBehaviour
}

export class LampBehaviour extends ElectricalBehaviour {
    resistance = 10
    brightness = 0

    update(pixel: Pixel, pixelPos: Position, grid: Grid): void {
        this.powered = this.voltage > 0

        if (!this.powered) {
            this.brightness = 0
            this.updateBrightness(pixelPos, grid)
            return
        }

        this.brightness = Math.min(1, this.current / 1.2)
        this.updateBrightness(pixelPos, grid)
    }

    canTransferTo(other: ElectricalBehaviour): boolean {
        return other instanceof LampBehaviour
    }

    updateBrightness(pixelPos: Position, grid: Grid) {
        if (this.brightness == 0) {
            grid.nextGrid[pixelPos.y][pixelPos.x].colour = `rgb(20, 20, 20)`
        }
        const dark = { r: 20, g: 20, b: 20 }
        const bright = { r: 255, g: 220, b: 80 }

        const r = Math.floor(dark.r + (bright.r - dark.r) * this.brightness)
        const g = Math.floor(dark.g + (bright.g - dark.g) * this.brightness)
        const b = Math.floor(dark.b + (bright.b - dark.b) * this.brightness)

        grid.nextGrid[pixelPos.y][pixelPos.x].colour = `rgb(${r}, ${g}, ${b})`
    }

    clone(): PixelBehaviour {
        const copy = new LampBehaviour()
        copy.voltage = this.voltage
        copy.powered = this.powered
        copy.brightness = this.brightness
        return new LampBehaviour()
    }
}

export class SteamGeneratorBehaviour extends ElectricalBehaviour implements PowerSource {
    voltage = 12
    maxCurrent = 5
    generatedCurrent = 0
    resistance = 0

    update(pixel: Pixel, pixelPos: Position, grid: Grid): void {
        this.generatedCurrent = 0

        for (const neighbour of grid.getNeighbours(pixelPos.x, pixelPos.y)) {
            const other = grid.nextGrid[neighbour.y][neighbour.x]

            if (other.id == 6) {
                this.generatedCurrent += 1
            }
        }

        this.generatedCurrent = Math.min(this.generatedCurrent, this.maxCurrent)

        this.voltage = this.generatedCurrent > 0 ? 12 : 0

        this.powered = this.generatedCurrent > 0

        if (!this.powered) return

        let circuit = findCircuit(pixelPos, pixelPos, grid)
        
        for (const pos of circuit.pixels) {
            const electrical = getBehaviour(grid.nextGrid[pos.y][pos.x], ElectricalBehaviour)
            if (!electrical) continue

            electrical.voltage = Math.max(this.voltage, electrical.voltage)
            electrical.powered = true
        }
    }

    canTransferTo(other: ElectricalBehaviour): boolean {
        return true
    }

    get current() {
        return this.generatedCurrent
    }

    clone(): PixelBehaviour {
        const copy = new SteamGeneratorBehaviour()
        copy.generatedCurrent = this.generatedCurrent
        return copy
    }
}

export class WireBehaviour extends ElectricalBehaviour {
    voltage: number = 0
    powered: boolean = false
    resistance: number = 1

    get current() {
        return 0
    }

    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        
    }

    canTransferTo(other: ElectricalBehaviour): boolean {
        return true
    }

    clone() {
        const copy = new WireBehaviour()
        copy.voltage = this.voltage
        copy.powered = this.powered
        return copy
    }
}

export class GravityBehaviour implements PixelBehaviour {
    gravity: number

    constructor(gravity: number) {
        this.gravity = gravity
    }

    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        let direction = Math.sign(this.gravity)

        if (!grid.inBounds(pixelPos.x, pixelPos.y + direction) && this.gravity < 0) {
            grid.nextGrid[pixelPos.y][pixelPos.x] = new Pixel(0)
            grid.updated[pixelPos.y][pixelPos.x] = true
            return true
        }

        if (!grid.inBounds(pixelPos.x, pixelPos.y + direction)) {
            return false
        }
        let target = grid.nextGrid[pixelPos.y + direction][pixelPos.x]

        if (
            grid.inBounds(pixelPos.x, pixelPos.y + direction) &&
            (
                grid.isClear(pixelPos.x, pixelPos.y + direction)
                ||
                (
                    target.id != 0 &&
                    getBehaviour(target, FluidBehaviour) &&
                    !getBehaviour(pixel, FluidBehaviour)
                )
            )
        ) {
            grid.move(
                pixelPos.x,
                pixelPos.y,
                pixelPos.x,
                pixelPos.y + direction
            )
            return true
        }

        // if (getBehaviour(pixel, FluidBehaviour)) return

        let sides = Math.random() < 0.5
            ? [-1, 1]
            : [1, -1]

        for (const side of sides) {
            if 
            (
                grid.inBounds(pixelPos.x + side, pixelPos.y + direction) && 
                grid.isClear(pixelPos.x + side, pixelPos.y + direction) && 
                grid.isClear(pixelPos.x + side, pixelPos.y)
            ) {
                grid.move(pixelPos.x, pixelPos.y, pixelPos.x + side, pixelPos.y + direction)
                return true
            }
        }
        return false
    }

    clone() {
        return new GravityBehaviour(this.gravity)
    }
}


//Fluids sometimes duplicate themselves? Something to do with shift not working properly, 
// also fluids are duplicating wrong when shifting shown through the colours are duplicating
export class FluidBehaviour implements PixelBehaviour {
    gravityBehaviour: GravityBehaviour
    viscosity: number
    density: number

    constructor(gravity: number, density: number, viscosity: number) {
        this.gravityBehaviour = new GravityBehaviour(gravity)
        this.density = density
        this.viscosity = viscosity
    }

    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        const direction = Math.sign(this.gravityBehaviour.gravity)

        const x = pixelPos.x
        const y = pixelPos.y
        const newY = y + direction

        // Try moving down/up first
        if (this.gravityBehaviour.update(pixel, pixelPos, grid)) {
            return
        }

        let sides: number[]

        // Continue existing flow direction
        if (pixel.velocityX != 0) {
            let current = grid.getFlowDistance(x, y, pixel.velocityX)
            let opposite = grid.getFlowDistance(x, y, -pixel.velocityX)

            if (opposite > current + 3) {
                pixel.velocityX *= -1
            }

            sides = [pixel.velocityX, -pixel.velocityX]

        } else {
            sides = grid.getFluidDirections(x, y)
        }


        // Sideways flow
        let moved = false

        for (const side of sides) {
            const newX = x + side

            if (
                grid.inBounds(newX, y) &&
                !grid.isGas(pixel) && 
                pixel.id != 4 &&
                (grid.isClear(newX, y) || grid.nextGrid[y][newX].id == pixel.id) &&
                grid.canFlowDown(x, y, side)
            ) {
                moved = this.shift(pixel, pixelPos, grid, side)
                break
            }
        }

        if (!grid.inBounds(x, newY)) {
            return
        }


        let targetPixel = grid.nextGrid[newY][x]
        let otherFluid = getBehaviour(
            targetPixel,
            FluidBehaviour
        )

        if (
            !moved &&
            otherFluid &&
            (
                // Same density: hotter fluid rises
                (
                    this.density === otherFluid.density &&
                    pixel.temperature < targetPixel.temperature
                )
                ||
                // Different density: denser fluid sinks
                (
                    this.density > otherFluid.density
                )
            )
        ) {
            let movedPixel = pixel.clone()
            movedPixel.velocityX = 0

            let displaced = targetPixel.clone()

            if (pixel.id == targetPixel.id) {
                let displacedColour = displaced.colour
                displaced.colour = movedPixel.colour
                movedPixel.colour = displacedColour
            }

            grid.nextGrid[newY][x] = movedPixel
            grid.nextGrid[y][x] = displaced

            grid.updated[y][x] = true
            grid.updated[newY][x] = true

            return
        }
    }

    shift(pixel: Pixel, pixelPos: Position, grid: Grid, direction: number): boolean {
        let newX = pixelPos.x + direction

        if (!grid.inBounds(newX, pixelPos.y)) {
            return false
        }

        let targetPixel = grid.nextGrid[pixelPos.y][newX]
        let fluidBehaviour = getBehaviour(targetPixel, FluidBehaviour)

        let shifted = false
        if (fluidBehaviour) {
            shifted = fluidBehaviour.shift(targetPixel, { x: newX, y: pixelPos.y }, grid, direction)
            targetPixel = grid.nextGrid[pixelPos.y][newX]
        }

        if (shifted || targetPixel.id == 0 || (grid.isGas(targetPixel) && !grid.isGas(pixel))) {
            let displaced = targetPixel.clone()
            let movedPixel = pixel.clone()
            movedPixel.velocityX = direction
            grid.nextGrid[pixelPos.y][newX] = movedPixel
            grid.nextGrid[pixelPos.y][pixelPos.x] = displaced

            grid.updated[pixelPos.y][newX] = true
            grid.updated[pixelPos.y][pixelPos.x] = true
            this.trySettle(pixel, pixelPos, grid)

            return true
        }

        return false
    }

    trySettle(pixel: Pixel, pixelPos: Position, grid: Grid) {
        let newY = pixelPos.y + this.gravityBehaviour.gravity
        if (grid.inBounds(pixelPos.x, newY)) {
            let targetPixel = grid.nextGrid[newY][pixelPos.x]
            if (grid.isClear(pixelPos.x, newY) || grid.isGas(targetPixel))   {
                let displaced = targetPixel.clone()
                let movedPixel = pixel.clone()
                grid.nextGrid[newY][pixelPos.x] = movedPixel
                grid.nextGrid[pixelPos.y][pixelPos.x] = displaced

                grid.updated[newY][pixelPos.x] = true
                grid.updated[pixelPos.y][pixelPos.x] = true
                return true
            }
        }
        return false
    }

    clone() {
        return new FluidBehaviour(this.gravityBehaviour.gravity, this.density, this.viscosity)
    }
}

export class PlantBehaviour implements PixelBehaviour {
    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        if (Math.random() < 0.005 && pixelPos.y > 0) {
            let waterPos = floodFillSearch(pixelPos, 13, 2, grid)
            if (!waterPos) return
            
            let growthX = [pixelPos.x]
            
            for (let x of growthX) {
                if (x < 0 || x >= grid.columns) continue
                if (grid.nextGrid[pixelPos.y - 1][x].id == 0 || grid.nextGrid[pixelPos.y - 1][x].id == 2) {
                    grid.nextGrid[pixelPos.y - 1][x].nextId = 13
                    grid.nextGrid[pixelPos.y - 1][x].updateInfo()
                    grid.nextGrid[waterPos.y][waterPos.x].nextId = 0
                    grid.nextGrid[waterPos.y][waterPos.x].updateInfo()
                }
            }
        }
    }

    clone() {
        return new PlantBehaviour()
    }
}

export class FlammableBehaviour implements PixelBehaviour {
    burning: boolean
    burnDuration: number
    maxBurnDuration: number
    ignitionEnergy: number
    ignitionResult: number
    burnHeatProduction: number

    constructor(duration: number, ignitionEnergy: number, ignitionResult: number, burnHeatProduction: number) {
        this.burning = false
        this.maxBurnDuration = duration
        this.burnDuration = duration
        this.ignitionEnergy = ignitionEnergy
        this.ignitionResult = ignitionResult
        this.burnHeatProduction = burnHeatProduction
    }

    update(pixel: Pixel, pixelPos: Position, grid: Grid) {
        if (this.burning || pixel.thermalEnergy > this.ignitionEnergy) {
            this.burning = true
            
            let nextFlammable = getBehaviour(grid.nextGrid[pixelPos.y][pixelPos.x], FlammableBehaviour)
            if (nextFlammable) {
                nextFlammable.burnDuration -= 1
            }

            if (this.burnDuration <= 0) {
                pixel.nextId = this.ignitionResult
            }
            let neighbours = grid.getNeighbours(pixelPos.x, pixelPos.y)
            for (let neighbour of neighbours) {
                let neighbourPixel = grid.nextGrid[neighbour.y][neighbour.x]

                let flammable = getBehaviour(neighbourPixel, FlammableBehaviour)
                if (flammable) {
                    flammable.burning = true
                } else if (neighbourPixel.id == 0 || neighbourPixel.id == 5) {
                    grid.nextGrid[neighbour.y][neighbour.x] = new Pixel(4)
                }
            }
        }
    }
    
    clone() {
        let copy = new FlammableBehaviour(this.maxBurnDuration, this.ignitionEnergy, this.ignitionResult, this.burnHeatProduction)
        copy.burning = this.burning
        copy.burnDuration = this.burnDuration
        return copy
    }
}


function floodFillSearch(origin: Position, pixelType: number, targetType: number, grid: Grid) {
    return floodFill(origin, grid, p => p.id == pixelType)
        .find(pos => grid.pixels[pos.y][pos.x].id == targetType)
}

function floodFill(
    origin: Position,
    grid: Grid,
    canVisit: (pixel: Pixel) => boolean
): Position[] {
    let queue: Position[] = [origin]
    let visited: Record<number, Record<number, boolean>> = {}
    let result: Position[] = []

    while (queue.length > 0) {
        let front = queue.shift()!

        if (visited[front.x]?.[front.y]) {
            continue
        }

        visited[front.x] ??= {}
        visited[front.x][front.y] = true

        if (!canVisit(grid.nextGrid[front.y][front.x])) {
            continue
        }

        result.push(front)
        queue.push(...grid.getAdjacent(front.x, front.y))
    }

    return result
}

type Circuit = {
    pixels: Position[]
    components: ElectricalBehaviour[]
    reachesOtherTerminal: boolean
}

type CircuitNode = {
    pos: Position
    from?: ElectricalBehaviour
}

function findCircuit(
    start: Position,
    end: Position,
    grid: Grid
): Circuit {
    const queue: CircuitNode[] = [
        { pos: start }
    ]

    const visited = new Set<string>()

    const pixels: Position[] = []
    const components: ElectricalBehaviour[] = []

    let reachesOtherTerminal = false

    while (queue.length > 0) {
        const node = queue.shift()!
        const pos = node.pos

        const key = `${pos.x},${pos.y}`
        if (visited.has(key)) continue
        visited.add(key)

        if (pos.x === end.x && pos.y === end.y) {
            reachesOtherTerminal = true
        }

        const pixel = grid.nextGrid[pos.y][pos.x]
        const electrical = getBehaviour(pixel, ElectricalBehaviour)

        if (!electrical) continue

        // Check if electricity is allowed to enter this object
        if (
            node.from &&
            !node.from.canTransferTo(electrical)
        ) {
            continue
        }

        pixels.push(pos)

        if (electrical.resistance > 0) {
            components.push(electrical)
        }

        for (const neighbour of grid.getAdjacent(pos.x, pos.y)) {
            queue.push({
                pos: neighbour,
                from: electrical
            })
        }
    }

    return {
        pixels,
        components,
        reachesOtherTerminal
    }
}


export function getBehaviour<T extends PixelBehaviour>(
    pixel: Pixel,
    type: abstract new (...args: any[]) => T
): T | undefined {
    return pixel.behaviours.find(
        b => b instanceof type
    ) as T | undefined
}