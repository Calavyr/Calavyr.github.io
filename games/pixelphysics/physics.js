import { FlammableBehaviour, getBehaviour } from './behaviours.js';
import { Grid } from './grid.js';
import { Pixel } from './pixel.js';
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const brushSizeSlider = document.getElementById('brushSize');
let brushSize = 1;
brushSizeSlider.onchange = (e) => {
    brushSize = parseInt(brushSizeSlider.value);
};
let canvasConfig = {
    rows: 100,
    columns: 100,
    columnWidth: 0,
    rowHeight: 0
};
canvasConfig.columnWidth = canvas.width / canvasConfig.columns;
canvasConfig.rowHeight = canvas.height / canvasConfig.rows;
const grid = new Grid(canvasConfig.rows, canvasConfig.columns);
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    grid.updatePixels();
    for (let y = 0; y < canvasConfig.rows; y++) {
        for (let x = 0; x < canvasConfig.columns; x++) {
            let pixel = grid.pixels[y][x];
            ctx.fillStyle = pixel.colour;
            ctx.fillRect(x * canvasConfig.columnWidth, y * canvasConfig.rowHeight, canvasConfig.columnWidth, canvasConfig.rowHeight);
        }
    }
    window.requestAnimationFrame(render);
    if (mousePos.x == -1 && mousePos.y == -1)
        return;
    let mousePixel = grid.nextGrid[mousePos.y][mousePos.x];
    let temperature = Math.trunc(mousePixel.temperature * 100) / 100;
    let thermalEnergy = Math.trunc(mousePixel.thermalEnergy * 100) / 100;
    let flammableBehaviour = getBehaviour(mousePixel, FlammableBehaviour);
    document.getElementById('nameDisplay').innerText = `Name: ${mousePixel.info.name}`;
    document.getElementById('tempDisplay').innerText = `Temperature: ${temperature}`;
    document.getElementById('heatDisplay').innerText = `Thermal Energy: ${thermalEnergy}`;
    if (flammableBehaviour) {
        document.getElementById('burnDisplay').innerText = `Burn Time: ${flammableBehaviour.burnDuration}`;
    }
    else {
        document.getElementById('burnDisplay').innerText = ``;
    }
    if (mouseDown) {
        pixelBrush();
    }
}
window.requestAnimationFrame(render);
let mouseDown = false;
document.onmousedown = (e) => {
    mouseDown = true;
};
document.onmouseup = (e) => {
    mouseDown = false;
};
let selectedPixel = 1;
let mousePos = { x: 0, y: 0 };
document.onmousemove = (e) => {
    let canvasRect = canvas.getBoundingClientRect();
    let canvasMouseOffsetX = e.clientX - canvasRect.left;
    let canvasMouseOffsetY = e.clientY - canvasRect.top;
    let centreX = Math.floor(canvasMouseOffsetX / canvasConfig.columnWidth);
    let centreY = Math.floor(canvasMouseOffsetY / canvasConfig.rowHeight);
    if (centreX >= 0 && centreX < canvasConfig.columns && centreY >= 0 && centreY < canvasConfig.rows) {
        mousePos.x = centreX;
        mousePos.y = centreY;
    }
    else {
        mousePos.x = -1;
        mousePos.y = -1;
    }
    if (!mouseDown)
        return;
};
function pixelBrush() {
    for (let xOff = -(brushSize - 1); xOff < brushSize; xOff++) {
        for (let yOff = -(brushSize - 1); yOff < brushSize; yOff++) {
            let x = mousePos.x + xOff;
            let y = mousePos.y + yOff;
            if (x < 0 || x >= canvasConfig.columns)
                continue;
            if (y < 0 || y >= canvasConfig.rows)
                continue;
            if (grid.pixels[y][x].id == 0) {
                grid.pixels[y][x] = new Pixel(selectedPixel);
            }
            else {
                let heat = grid.pixels[y][x].thermalEnergy;
                let newPixel = new Pixel(selectedPixel);
                newPixel.thermalEnergy = heat;
                grid.pixels[y][x] = newPixel;
            }
        }
    }
}
window.onkeydown = (e) => {
    if (!isNaN(parseInt(e.key))) {
        selectedPixel = parseInt(e.key);
    }
    if (e.key == 'i') {
        grid.nextGrid[mousePos.y][mousePos.x].log();
    }
};
document.getElementById('fillButton').onclick = () => {
    for (let y = 0; y < canvasConfig.rows; y++) {
        for (let x = 0; x < canvasConfig.columns; x++) {
            grid.nextGrid[y][x].id = selectedPixel;
            grid.nextGrid[y][x].nextId = selectedPixel;
            grid.nextGrid[y][x].updateInfo();
            grid.nextGrid[y][x].thermalEnergy = grid.nextGrid[y][x].info.thermalEnergy;
        }
    }
};
import { pixelIds } from './pixel.js';
const materialButtons = document.getElementById('materialButtons');
let keys = Object.keys(pixelIds);
for (let i = 0; i < keys.length; i++) {
    const id = Number(keys[i]);
    const pixel = pixelIds[id];
    const button = document.createElement('button');
    button.textContent = pixel.name;
    button.dataset.id = id.toString();
    button.addEventListener('click', () => {
        selectedPixel = id;
    });
    materialButtons.appendChild(button);
}
