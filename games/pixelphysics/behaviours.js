import { Pixel } from './pixel.js';
export class StructureBehaviour {
    getStructure(pixelPos, grid) {
        return grid.getStructure(pixelPos, this.structureIds);
    }
}
export class BatteryPartBehaviour extends StructureBehaviour {
    structureType = "battery";
    structureIds = new Set([17, 18, 19]);
    energy = 10000;
    maxEnergy = 10000;
    voltage = 12;
    resistance = 0.1;
    get current() {
        return this.energy > 0 ? Infinity : 0;
    }
    update(pixel, pixelPos, grid) {
        if (this.energy <= 0) {
            return;
        }
        const structure = this.getStructure(pixelPos, grid);
        if (structure.owner.x != pixelPos.x && structure.owner.y != pixelPos.y) {
            return;
        }
        const body = structure.byId.get(17) ?? [];
        const positive = structure.byId.get(18) ?? [];
        const negative = structure.byId.get(19) ?? [];
        if (positive.length == 0 || negative.length == 0) {
            return;
        }
        const circuit = findCircuit(positive[0], negative[0], grid);
        if (!circuit.reachesOtherTerminal)
            return;
        let currentDraw = 0;
        for (const pos of circuit.pixels) {
            const pixel = grid.nextGrid[pos.y][pos.x];
            const electrical = getBehaviour(pixel, ElectricalBehaviour);
            if (!electrical)
                continue;
            electrical.voltage = Math.max(this.voltage, electrical.voltage);
            electrical.powered = true;
            currentDraw += electrical.current;
        }
        this.energy -= currentDraw * 0.01;
        if (this.energy < 0) {
            this.energy = 0;
        }
    }
    clone() {
        const copy = new BatteryPartBehaviour();
        copy.energy = this.energy;
        return copy;
    }
}
export class ElectricalBehaviour {
    voltage = 0;
    powered = false;
    resistance = 1;
    get current() {
        if (!this.powered)
            return 0;
        return this.voltage / this.resistance;
    }
    canTransferTo(other) {
        return false;
    }
}
export class LampBehaviour extends ElectricalBehaviour {
    resistance = 10;
    brightness = 0;
    update(pixel, pixelPos, grid) {
        this.powered = this.voltage > 0;
        if (!this.powered) {
            this.brightness = 0;
            this.updateBrightness(pixelPos, grid);
            return;
        }
        this.brightness = Math.min(1, this.current / 1.2);
        this.updateBrightness(pixelPos, grid);
    }
    canTransferTo(other) {
        return other instanceof LampBehaviour;
    }
    updateBrightness(pixelPos, grid) {
        if (this.brightness == 0) {
            grid.nextGrid[pixelPos.y][pixelPos.x].colour = `rgb(20, 20, 20)`;
        }
        const dark = { r: 20, g: 20, b: 20 };
        const bright = { r: 255, g: 220, b: 80 };
        const r = Math.floor(dark.r + (bright.r - dark.r) * this.brightness);
        const g = Math.floor(dark.g + (bright.g - dark.g) * this.brightness);
        const b = Math.floor(dark.b + (bright.b - dark.b) * this.brightness);
        grid.nextGrid[pixelPos.y][pixelPos.x].colour = `rgb(${r}, ${g}, ${b})`;
    }
    clone() {
        const copy = new LampBehaviour();
        copy.brightness = this.brightness;
        return copy;
    }
}
export class SteamGeneratorBehaviour extends ElectricalBehaviour {
    voltage = 12;
    maxCurrent = 5;
    generatedCurrent = 0;
    resistance = 0;
    update(pixel, pixelPos, grid) {
        this.generatedCurrent = 0;
        for (const neighbour of grid.getNeighbours(pixelPos.x, pixelPos.y)) {
            const other = grid.nextGrid[neighbour.y][neighbour.x];
            if (other.id == 6) {
                this.generatedCurrent += 1;
            }
        }
        this.generatedCurrent = Math.min(this.generatedCurrent, this.maxCurrent);
        this.voltage = this.generatedCurrent > 0 ? 12 : 0;
        this.powered = this.generatedCurrent > 0;
        if (!this.powered)
            return;
        let circuit = findCircuit(pixelPos, pixelPos, grid);
        for (const pos of circuit.pixels) {
            const electrical = getBehaviour(grid.nextGrid[pos.y][pos.x], ElectricalBehaviour);
            if (!electrical)
                continue;
            electrical.voltage = Math.max(this.voltage, electrical.voltage);
            electrical.powered = true;
        }
    }
    canTransferTo(other) {
        return true;
    }
    get current() {
        return this.generatedCurrent;
    }
    clone() {
        const copy = new SteamGeneratorBehaviour();
        copy.generatedCurrent = this.generatedCurrent;
        return copy;
    }
}
export class WireBehaviour extends ElectricalBehaviour {
    voltage = 0;
    powered = false;
    resistance = 1;
    get current() {
        return 0;
    }
    update(pixel, pixelPos, grid) {
    }
    canTransferTo(other) {
        return true;
    }
    clone() {
        const copy = new WireBehaviour();
        return copy;
    }
}
export class GravityBehaviour {
    gravity;
    constructor(gravity) {
        this.gravity = gravity;
    }
    update(pixel, pixelPos, grid) {
        let direction = Math.sign(this.gravity);
        if (!grid.inBounds(pixelPos.x, pixelPos.y + direction) && this.gravity < 0) {
            grid.nextGrid[pixelPos.y][pixelPos.x] = new Pixel(0);
            grid.updated[pixelPos.y][pixelPos.x] = true;
            return true;
        }
        if (!grid.inBounds(pixelPos.x, pixelPos.y + direction)) {
            return false;
        }
        let target = grid.nextGrid[pixelPos.y + direction][pixelPos.x];
        if (grid.inBounds(pixelPos.x, pixelPos.y + direction) &&
            (grid.isClear(pixelPos.x, pixelPos.y + direction)
                ||
                    (target.id != 0 &&
                        getBehaviour(target, FluidBehaviour) &&
                        !getBehaviour(pixel, FluidBehaviour)))) {
            grid.move(pixelPos.x, pixelPos.y, pixelPos.x, pixelPos.y + direction);
            return true;
        }
        // if (getBehaviour(pixel, FluidBehaviour)) return
        let sides = Math.random() < 0.5
            ? [-1, 1]
            : [1, -1];
        for (const side of sides) {
            if (grid.inBounds(pixelPos.x + side, pixelPos.y + direction) &&
                grid.isClear(pixelPos.x + side, pixelPos.y + direction) &&
                grid.isClear(pixelPos.x + side, pixelPos.y)) {
                grid.move(pixelPos.x, pixelPos.y, pixelPos.x + side, pixelPos.y + direction);
                return true;
            }
        }
        return false;
    }
    clone() {
        return new GravityBehaviour(this.gravity);
    }
}
// Fluids under other fluids don't spread out or do anything. Same with powders in fluids. ie. sand in water can build towers, water in oil can do the same
export class FluidBehaviour {
    gravityBehaviour;
    viscosity;
    density;
    constructor(gravity, density, viscosity) {
        this.gravityBehaviour = new GravityBehaviour(gravity);
        this.density = density;
        this.viscosity = viscosity;
    }
    update(pixel, pixelPos, grid) {
        const direction = Math.sign(this.gravityBehaviour.gravity);
        const x = pixelPos.x;
        const y = pixelPos.y;
        const newY = y + direction;
        if (this.gravityBehaviour.update(pixel, pixelPos, grid)) {
            return;
        }
        // 1) Try swapping vertically first
        if (grid.inBounds(x, newY)) {
            const targetPixel = grid.nextGrid[newY][x];
            const otherFluid = getBehaviour(targetPixel, FluidBehaviour);
            if (otherFluid &&
                ((this.density === otherFluid.density && pixel.temperature < targetPixel.temperature) ||
                    (this.density > otherFluid.density))) {
                const movedPixel = pixel.clone();
                movedPixel.velocityX = 0;
                const displaced = targetPixel.clone();
                if (pixel.id === targetPixel.id) {
                    const displacedColour = displaced.colour;
                    displaced.colour = movedPixel.colour;
                    movedPixel.colour = displacedColour;
                }
                grid.nextGrid[newY][x] = movedPixel;
                grid.nextGrid[y][x] = displaced;
                grid.updated[y][x] = true;
                grid.updated[newY][x] = true;
                return;
            }
        }
        // 2) Only then try sideways movement
        let sides;
        if (pixel.velocityX !== 0) {
            const current = grid.getFlowDistance(x, y, pixel.velocityX, this.gravityBehaviour.gravity);
            const opposite = grid.getFlowDistance(x, y, -pixel.velocityX, this.gravityBehaviour.gravity);
            if (opposite > current + 3) {
                pixel.velocityX *= -1;
            }
            sides = [pixel.velocityX, -pixel.velocityX];
        }
        else {
            sides = grid.getFluidDirections(x, y, this.gravityBehaviour.gravity);
        }
        let moved = false;
        for (const side of sides) {
            const newX = x + side;
            if (grid.inBounds(newX, y) &&
                pixel.id !== 4 &&
                (grid.isClear(newX, y) || grid.nextGrid[y][newX].id === pixel.id) &&
                grid.canFlow(x, y, side, direction)) {
                const result = this.shiftChain(pixel, pixelPos, grid, side);
                moved = result.moved;
                if (result.hitWall && !result.moved) {
                    pixel.velocityX = -pixel.velocityX;
                }
                break;
            }
        }
    }
    shiftChain(pixel, pixelPos, grid, direction) {
        const y = pixelPos.y;
        const chain = [];
        let cx = pixelPos.x;
        let hitWall = false;
        while (true) {
            if (!grid.inBounds(cx, y)) {
                hitWall = true;
                return { moved: false, hitWall: true };
            }
            const p = grid.nextGrid[y][cx];
            if (p.id === 0) {
                break;
            }
            if (!getBehaviour(p, FluidBehaviour) && cx !== pixelPos.x) {
                hitWall = true;
                return { moved: false, hitWall: true };
            }
            chain.push({ x: cx, y });
            cx += direction;
        }
        if (!grid.inBounds(cx, y) || grid.nextGrid[y][cx].id !== 0) {
            return { moved: false, hitWall: true };
        }
        for (let i = chain.length - 1; i >= 0; i--) {
            const from = chain[i];
            const toX = from.x + direction;
            const movedPixel = grid.nextGrid[y][from.x].clone();
            movedPixel.velocityX = direction;
            grid.nextGrid[y][toX] = movedPixel;
            grid.nextGrid[y][from.x] = new Pixel(0);
            grid.updated[y][toX] = true;
            grid.updated[y][from.x] = true;
            chain[i] = { x: toX, y: chain[i].y };
        }
        for (let i = chain.length - 1; i >= 0; i--) {
            const pixelPos = chain[i];
            const pixel = grid.nextGrid[pixelPos.y][pixelPos.x];
            let fluidBehaviour = getBehaviour(pixel, FluidBehaviour);
            if (fluidBehaviour) {
                fluidBehaviour.trySettle(pixel, pixelPos, grid);
            }
        }
        return { moved: true, hitWall: false };
    }
    trySettle(pixel, pixelPos, grid) {
        let newY = pixelPos.y + this.gravityBehaviour.gravity;
        if (grid.inBounds(pixelPos.x, newY)) {
            let targetPixel = grid.nextGrid[newY][pixelPos.x];
            if (grid.isClear(pixelPos.x, newY) || grid.isGas(targetPixel)) {
                let displaced = targetPixel.clone();
                let movedPixel = pixel.clone();
                grid.nextGrid[newY][pixelPos.x] = movedPixel;
                grid.nextGrid[pixelPos.y][pixelPos.x] = displaced;
                grid.updated[newY][pixelPos.x] = true;
                grid.updated[pixelPos.y][pixelPos.x] = true;
                return true;
            }
        }
        return false;
    }
    clone() {
        return new FluidBehaviour(this.gravityBehaviour.gravity, this.density, this.viscosity);
    }
}
export class PlantBehaviour {
    update(pixel, pixelPos, grid) {
        if (Math.random() < 0.005 && pixelPos.y > 0) {
            let waterPos = grid.floodFill(pixelPos, p => p.id == 13)
                .find(pos => grid.pixels[pos.y][pos.x].id == 2);
            if (!waterPos)
                return;
            let growthX = [pixelPos.x];
            for (let x of growthX) {
                if (x < 0 || x >= grid.columns)
                    continue;
                if (grid.nextGrid[pixelPos.y - 1][x].id == 0 || grid.nextGrid[pixelPos.y - 1][x].id == 2) {
                    grid.nextGrid[pixelPos.y - 1][x].nextId = 13;
                    grid.nextGrid[pixelPos.y - 1][x].updateInfo();
                    grid.nextGrid[waterPos.y][waterPos.x].nextId = 0;
                    grid.nextGrid[waterPos.y][waterPos.x].updateInfo();
                }
            }
        }
    }
    clone() {
        return new PlantBehaviour();
    }
}
export class FlammableBehaviour {
    burning;
    burnDuration;
    maxBurnDuration;
    ignitionEnergy;
    ignitionResult;
    burnHeatProduction;
    constructor(duration, ignitionEnergy, ignitionResult, burnHeatProduction) {
        this.burning = false;
        this.maxBurnDuration = duration;
        this.burnDuration = duration;
        this.ignitionEnergy = ignitionEnergy;
        this.ignitionResult = ignitionResult;
        this.burnHeatProduction = burnHeatProduction;
    }
    update(pixel, pixelPos, grid) {
        if (this.burning || pixel.thermalEnergy > this.ignitionEnergy) {
            this.burning = true;
            let nextFlammable = getBehaviour(grid.nextGrid[pixelPos.y][pixelPos.x], FlammableBehaviour);
            if (nextFlammable) {
                nextFlammable.burnDuration -= 1;
            }
            if (this.burnDuration <= 0) {
                let nextPixel = grid.nextGrid[pixelPos.y][pixelPos.x];
                nextPixel.nextId = this.ignitionResult;
                nextPixel.updateInfo();
            }
            let neighbours = grid.getNeighbours(pixelPos.x, pixelPos.y);
            for (let neighbour of neighbours) {
                let neighbourPixel = grid.nextGrid[neighbour.y][neighbour.x];
                let flammable = getBehaviour(neighbourPixel, FlammableBehaviour);
                if (flammable) {
                    flammable.burning = true;
                }
                else if (neighbourPixel.id == 0 || neighbourPixel.id == 5) {
                    grid.nextGrid[neighbour.y][neighbour.x] = new Pixel(4);
                }
            }
        }
    }
    clone() {
        let copy = new FlammableBehaviour(this.maxBurnDuration, this.ignitionEnergy, this.ignitionResult, this.burnHeatProduction);
        copy.burning = this.burning;
        copy.burnDuration = this.burnDuration;
        return copy;
    }
}
function findCircuit(start, end, grid) {
    const queue = [
        { pos: start }
    ];
    const visited = new Set();
    const pixels = [];
    const components = [];
    let reachesOtherTerminal = false;
    while (queue.length > 0) {
        const node = queue.shift();
        const pos = node.pos;
        const key = `${pos.x},${pos.y}`;
        if (visited.has(key))
            continue;
        visited.add(key);
        if (pos.x === end.x && pos.y === end.y) {
            reachesOtherTerminal = true;
        }
        const pixel = grid.nextGrid[pos.y][pos.x];
        const electrical = getBehaviour(pixel, ElectricalBehaviour);
        if (!electrical)
            continue;
        // Check if electricity is allowed to enter this object
        if (node.from &&
            !node.from.canTransferTo(electrical)) {
            continue;
        }
        pixels.push(pos);
        if (electrical.resistance > 0) {
            components.push(electrical);
        }
        for (const neighbour of grid.getAdjacent(pos.x, pos.y)) {
            queue.push({
                pos: neighbour,
                from: electrical
            });
        }
    }
    return {
        pixels,
        components,
        reachesOtherTerminal
    };
}
export function getBehaviour(pixel, type) {
    return pixel.behaviours.find(b => b instanceof type);
}
