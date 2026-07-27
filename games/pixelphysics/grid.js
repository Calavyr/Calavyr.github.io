import { FluidBehaviour, getBehaviour, GravityBehaviour } from './behaviours.js';
import { Pixel, interactions } from './pixel.js';
// Change buffer system so that when things fall or rise they dont do so in alternating rows of air and the material
// Also so that sand can fall through water even if the water is still moving
// And other stuff like that that arises because of refusing to update already updating tiles
export class Grid {
    rows;
    columns;
    pixels;
    ambientTemperature;
    constructor(rows, columns) {
        this.rows = rows;
        this.columns = columns;
        this.pixels = Array.from({ length: rows }, () => Array.from({ length: columns }, () => new Pixel(0)));
        this.ambientTemperature = 20;
        this.nextGrid = this.pixels.map(row => row.map(pixel => pixel.clone()));
        this.updated = Array.from({ length: this.rows }, () => Array(this.columns).fill(false));
    }
    nextGrid;
    updated;
    updatePixels() {
        this.nextGrid = this.pixels.map(row => row.map(pixel => pixel.clone()));
        this.updated = Array.from({ length: this.rows }, () => Array(this.columns).fill(false));
        // Falling / static pixels: bottom-to-top so vacancies propagate downward correctly
        for (let y = this.rows - 1; y >= 0; y--) {
            for (let x = this.columns - 1; x >= 0; x--) {
                let pixel = this.pixels[y][x];
                let fluidBehaviour = getBehaviour(pixel, FluidBehaviour);
                let gravityBehaviour = getBehaviour(pixel, GravityBehaviour);
                if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
                    gravityBehaviour = fluidBehaviour.gravityBehaviour;
                }
                if (gravityBehaviour && gravityBehaviour.gravity < 0)
                    continue;
                this.processPixel(x, y);
            }
        }
        // Rising pixels: top-to-bottom so vacancies propagate upward correctly
        for (let y = 0; y < this.rows; y++) {
            for (let x = this.columns - 1; x >= 0; x--) {
                let pixel = this.pixels[y][x];
                let fluidBehaviour = getBehaviour(pixel, FluidBehaviour);
                let gravityBehaviour = getBehaviour(pixel, GravityBehaviour);
                if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
                    gravityBehaviour = fluidBehaviour.gravityBehaviour;
                }
                if (gravityBehaviour && gravityBehaviour.gravity >= 0 || !gravityBehaviour)
                    continue;
                this.processPixel(x, y);
            }
        }
        this.updateHeat(this.nextGrid);
        this.pixels = this.nextGrid;
    }
    processPixel(x, y) {
        let pixel = this.pixels[y][x];
        if (this.updated[y][x])
            return;
        let pastInteractions = {};
        if (interactions[pixel.id]) {
            const neighbours = this.getNeighbours(x, y);
            for (const neighbour of neighbours) {
                const neighbourPixel = this.nextGrid[neighbour.y][neighbour.x];
                const interaction = interactions[pixel.id][neighbourPixel.id];
                if (interaction) {
                    if (!pastInteractions[pixel.id]) {
                        pastInteractions[pixel.id] = {};
                    }
                    pastInteractions[pixel.id][neighbourPixel.id] = true;
                    interaction(pixel, { x, y }, neighbourPixel, neighbour, this.pixels, this.nextGrid, this);
                }
            }
        }
        if (pixel.id == 4 &&
            !(pastInteractions[4] && pastInteractions[4][3])) {
            if (Math.random() < 0.2) {
                let heat = pixel.thermalEnergy;
                this.nextGrid[y][x] = new Pixel(5);
                this.nextGrid[y][x].thermalEnergy = heat;
                this.updated[y][x] = true;
                return;
            }
        }
        let fluidBehaviour = getBehaviour(pixel, FluidBehaviour);
        let gravityBehaviour = getBehaviour(pixel, GravityBehaviour);
        if (fluidBehaviour && fluidBehaviour.gravityBehaviour) {
            gravityBehaviour = fluidBehaviour.gravityBehaviour;
        }
        for (const behaviour of pixel.behaviours) {
            behaviour.update(pixel, { x: x, y: y }, this);
        }
        if (pixel.nextId != pixel.id) {
            pixel.id = pixel.nextId;
            pixel.updateInfo();
        }
    }
    move(oldX, oldY, newX, newY) {
        const movingPixel = this.nextGrid[oldY][oldX];
        const displacedPixel = this.nextGrid[newY][newX];
        this.nextGrid[newY][newX] = movingPixel;
        this.nextGrid[oldY][oldX] = displacedPixel;
        this.updated[oldY][oldX] = true;
        this.updated[newY][newX] = true;
    }
    updateHeat(nextGrid) {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                const pixel = this.nextGrid[y][x];
                const neighbours = [
                    [x + 1, y],
                    [x, y + 1]
                ];
                for (const [nx, ny] of neighbours) {
                    if (!this.inBounds(nx, ny))
                        continue;
                    this.transferHeat(pixel, this.nextGrid[ny][nx]);
                }
                pixel.thermalEnergy += pixel.info.passiveHeatProduction ?? 0;
                pixel.thermalEnergy += (this.ambientTemperature - pixel.temperature) * 0.001 * pixel.info.heatConductivity;
                if (pixel.info.boilingEnergy != undefined && pixel.thermalEnergy > pixel.info.boilingEnergy) {
                    pixel.nextId = pixel.info.boilingResult;
                    pixel.updateInfo();
                }
                if (pixel.info.freezingEnergy != undefined && pixel.thermalEnergy < pixel.info.freezingEnergy) {
                    pixel.nextId = pixel.info.freezingResult;
                    pixel.updateInfo();
                }
                if (pixel.info.meltingEnergy != undefined && pixel.thermalEnergy > pixel.info.meltingEnergy) {
                    pixel.nextId = pixel.info.meltingResult;
                    pixel.updateInfo();
                }
            }
        }
    }
    transferHeat(a, b) {
        const tempA = a.temperature;
        const tempB = b.temperature;
        const difference = tempA - tempB;
        const conductivity = (a.info.heatConductivity + b.info.heatConductivity) / 2;
        const energy = difference * conductivity * 0.01;
        a.thermalEnergy -= energy;
        b.thermalEnergy += energy;
    }
    isClear(x, y) {
        if (this.nextGrid[y][x].id != 0)
            return false;
        return this.pixels[y][x].id == 0 || this.updated[y][x];
    }
    inBounds(x, y) {
        return x >= 0 && y >= 0 && x < this.columns && y < this.rows;
    }
    getNeighbours(x, y) {
        let neighbours = [];
        for (let xOff = -1; xOff <= 1; xOff++) {
            for (let yOff = -1; yOff <= 1; yOff++) {
                if (xOff == 0 && yOff == 0 || !this.inBounds(x + xOff, y + yOff))
                    continue;
                neighbours.push({ x: x + xOff, y: y + yOff });
            }
        }
        return neighbours;
    }
    getAdjacent(x, y) {
        let neighbours = [];
        for (let xOff = -1; xOff <= 1; xOff++) {
            for (let yOff = -1; yOff <= 1; yOff++) {
                if (xOff == 0 && yOff == 0 || !this.inBounds(x + xOff, y + yOff) || (xOff == 0) == (yOff == 0))
                    continue;
                neighbours.push({ x: x + xOff, y: y + yOff });
            }
        }
        return neighbours;
    }
    getRow(y) {
        let row = [];
        for (let x = 0; x < this.columns; x++) {
            row.push({ x: x, y: y });
        }
        return row;
    }
    getFluidDirections(x, y) {
        let leftDistance = this.getFlowDistance(x, y, -1);
        let rightDistance = this.getFlowDistance(x, y, 1);
        if (leftDistance < rightDistance) {
            return [-1, 1];
        }
        else if (rightDistance < leftDistance) {
            return [1, -1];
        }
        // Equal distance, pick a random preference
        return Math.random() < 0.5 ? [-1, 1] : [1, -1];
    }
    getFlowDistance(x, y, direction) {
        let score = 0;
        for (let i = 1; i < 20; i++) {
            let newX = x + direction * i;
            if (newX < 0 || newX >= this.columns)
                break;
            // open horizontal space
            if (this.isEmptyForFluid(this.nextGrid[y][newX])) {
                score += 1;
            }
            // a place where water can actually fall
            if (y + 1 < this.rows &&
                this.isEmptyForFluid(this.nextGrid[y + 1][newX])) {
                score += 100;
            }
            // reward deeper drops
            if (y + 2 < this.rows &&
                this.isEmptyForFluid(this.nextGrid[y + 2][newX])) {
                score += 200;
            }
        }
        return score;
    }
    canFlowDown(x, y, side) {
        for (let i = 1; i <= this.columns; i++) {
            let checkX = x + side * i;
            if (checkX < 0 || checkX >= this.columns)
                return false;
            // blocked horizontally
            if (!this.isEmptyForFluid(this.nextGrid[y][checkX]) && this.nextGrid[y][checkX].id != this.nextGrid[y][x].id)
                return false;
            // can fall here
            if (this.nextGrid[y + 1] && this.isEmptyForFluid(this.nextGrid[y + 1][checkX]))
                return true;
        }
        return false;
    }
    isGas(pixel) {
        const fluid = getBehaviour(pixel, FluidBehaviour);
        return fluid !== undefined && fluid.gravityBehaviour.gravity < 0;
    }
    isFluid(pixel) {
        return getBehaviour(pixel, FluidBehaviour) != undefined;
    }
    isEmptyForFluid(pixel) {
        return pixel.id == 0 || this.isGas(pixel);
    }
}
