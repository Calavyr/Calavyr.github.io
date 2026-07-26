import { Pixel } from './pixel.js';
export class GravityBehaviour {
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
        let sides = Math.random() < 0.5
            ? [-1, 1]
            : [1, -1];
        for (const side of sides) {
            if (grid.inBounds(pixelPos.x + side, pixelPos.y + direction) && grid.isClear(pixelPos.x + side, pixelPos.y + direction)) {
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
export class FluidBehaviour {
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
        // Try moving down/up first
        if (this.gravityBehaviour.update(pixel, pixelPos, grid)) {
            return;
        }
        let sides;
        // Continue existing flow direction
        if (pixel.velocityX != 0) {
            let current = grid.getFlowDistance(x, y, pixel.velocityX);
            let opposite = grid.getFlowDistance(x, y, -pixel.velocityX);
            if (opposite > current + 3) {
                pixel.velocityX *= -1;
            }
            sides = [pixel.velocityX, -pixel.velocityX];
        }
        else {
            sides = grid.getFluidDirections(x, y);
        }
        // Sideways flow
        let moved = false;
        for (const side of sides) {
            const newX = x + side;
            if (grid.inBounds(newX, y) &&
                grid.isClear(newX, y) &&
                grid.canFlowDown(x, y, side)) {
                let movedPixel = pixel.clone();
                movedPixel.velocityX = side;
                let displaced = grid.nextGrid[y][newX].clone();
                grid.nextGrid[y][newX] = movedPixel;
                grid.nextGrid[y][x] = displaced;
                grid.updated[y][x] = true;
                grid.updated[y][newX] = true;
                moved = true;
                break;
            }
        }
        if (!grid.inBounds(x, newY)) {
            return;
        }
        let targetPixel = grid.nextGrid[newY][x];
        let otherFluid = getBehaviour(targetPixel, FluidBehaviour);
        if (!moved &&
            otherFluid &&
            (
            // Same density: hotter fluid rises
            (this.density === otherFluid.density &&
                pixel.temperature < targetPixel.temperature)
                ||
                    // Different density: denser fluid sinks
                    (this.density > otherFluid.density))) {
            let movedPixel = pixel.clone();
            movedPixel.velocityX = 0;
            let displaced = targetPixel.clone();
            grid.nextGrid[newY][x] = movedPixel;
            grid.nextGrid[y][x] = displaced;
            grid.updated[y][x] = true;
            grid.updated[newY][x] = true;
            return;
        }
    }
    clone() {
        return new FluidBehaviour(this.gravityBehaviour.gravity, this.density, this.viscosity);
    }
}
export class PlantBehaviour {
    update(pixel, pixelPos, grid) {
        if (Math.random() < 0.005 && pixelPos.y > 0) {
            let waterPos = floodFillSearch(pixelPos, 13, 2, grid.nextGrid);
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
                pixel.nextId = this.ignitionResult;
            }
            let neighbours = getNeighbours(pixelPos.x, pixelPos.y, grid.nextGrid);
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
function floodFillSearch(origin, pixelType, targetType, grid) {
    let queue = getNeighbours(origin.x, origin.y, grid);
    let visited = {};
    while (queue.length > 0) {
        let front = queue.shift();
        if (grid[front.y][front.x].id == targetType) {
            return front;
        }
        if (visited[front.x] && visited[front.x][front.y]) {
            continue;
        }
        if (!visited[front.x]) {
            visited[front.x] = {};
        }
        visited[front.x][front.y] = true;
        if (grid[front.y][front.x].id == pixelType) {
            queue = queue.concat(getNeighbours(front.x, front.y, grid));
        }
    }
    return undefined;
}
function getNeighbours(x, y, grid) {
    let neighbours = [];
    for (let xOff = -1; xOff <= 1; xOff++) {
        for (let yOff = -1; yOff <= 1; yOff++) {
            if (xOff == 0 && yOff == 0 || x + xOff < 0 || x + xOff >= grid[0].length || y + yOff < 0 || y + yOff >= grid.length)
                continue;
            neighbours.push({ x: x + xOff, y: y + yOff });
        }
    }
    return neighbours;
}
export function getBehaviour(pixel, type) {
    return pixel.behaviours.find(b => b instanceof type);
}
