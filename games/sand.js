var imageInput = document.getElementById('imageInput');
var setImageButton = document.getElementById('setImageButton');
var clearButton = document.getElementById('clearButton');
var placeRangeInput = document.getElementById('placeRangeInput');
var gridWidthInput = document.getElementById('gridWidthInput');
var gridHeightInput = document.getElementById('gridHeightInput');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext("2d");
function randomHex() {
    var hex = '#';
    var letters = '0123456789ABCDEF';
    for (var i = 0; i < 6; i++) {
        hex += letters[Math.floor(Math.random() * 16)];
    }
    return hex;
}
var colours = [];
for (var i = 0; i < 25; i++) {
    colours.push(randomHex());
}
function deterministicRandomHex(seed) {
    var n = seed % colours.length;
    return colours[n];
}
function RGBAToHexA(r, g, b, a, forceRemoveAlpha) {
    if (forceRemoveAlpha === void 0) { forceRemoveAlpha = false; }
    var toHex = function (n) { return n.toString(16).padStart(2, '0'); };
    var alpha = Math.round(a * 255);
    return "#".concat(toHex(r)).concat(toHex(g)).concat(toHex(b)).concat(alpha < 255 ? toHex(alpha) : '');
}
var Vector2 = /** @class */ (function () {
    function Vector2(x, y) {
        this.x = x;
        this.y = y;
    }
    Vector2.prototype.add = function (other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    };
    Vector2.prototype.sub = function (other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    };
    return Vector2;
}());
var PixelTypes;
(function (PixelTypes) {
    PixelTypes[PixelTypes["AIR"] = 0] = "AIR";
    PixelTypes[PixelTypes["SAND"] = 1] = "SAND";
})(PixelTypes || (PixelTypes = {}));
var Pixel = /** @class */ (function () {
    function Pixel(x, y) {
        this.type = PixelTypes.AIR;
        this.position = new Vector2(x, y);
        this.colour = deterministicRandomHex(x + y);
    }
    return Pixel;
}());
var Grid = /** @class */ (function () {
    function Grid(w, h) {
        this.width = w;
        this.height = h;
        this.pixels = [];
        for (var x = 0; x < w; x++) {
            var column = [];
            for (var y = 0; y < h; y++) {
                var pixel = new Pixel(x, y);
                column.push(pixel);
            }
            this.pixels.push(column);
        }
    }
    Grid.prototype.render = function (ctx) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                if (this.pixels[x][y].type == PixelTypes.AIR)
                    continue;
                var currentPixel = this.pixels[x][y];
                ctx.fillStyle = currentPixel.colour;
                ctx.fillRect(currentPixel.position.x * (ctx.canvas.width / this.width), currentPixel.position.y * (ctx.canvas.height / this.height), ctx.canvas.width / this.width, ctx.canvas.height / this.height);
            }
        }
    };
    Grid.prototype.onGrid = function (x, y) {
        return ((x >= 0 && x < this.width)
            &&
                (y >= 0 && y < this.height));
    };
    Grid.prototype.step = function () {
        for (var x = this.width - 1; x >= 0; x--) {
            for (var y = this.height - 1; y >= 0; y--) {
                if (this.pixels[x][y].type == PixelTypes.AIR)
                    continue;
                if (this.onGrid(x, y + 1) && this.pixels[x][y + 1].type == PixelTypes.AIR) {
                    this.pixels[x][y + 1].type = PixelTypes.SAND;
                    this.pixels[x][y].type = PixelTypes.AIR;
                }
            }
        }
    };
    return Grid;
}());
var grid = new Grid(100, 100);
var range = 0;
placeRangeInput.onchange = function () {
    range = parseInt(placeRangeInput.value) - 1;
};
function updateGridSize() {
    grid = new Grid(parseInt(gridWidthInput.value), parseInt(gridHeightInput.value));
}
gridWidthInput.onchange = updateGridSize;
gridHeightInput.onchange = updateGridSize;
canvas.onmousemove = function (e) {
    var pixelPos = new Vector2(Math.min(Math.max(Math.floor(e.offsetX / (canvas.width / grid.width)), 0), grid.width - 1), Math.min(Math.max(Math.floor(e.offsetY / (canvas.height / grid.height)), 0), grid.height - 1));
    for (var i = range * -1; i <= range; i++) {
        for (var j = range * -1; j <= range; j++) {
            if (grid.onGrid(pixelPos.x + i, pixelPos.y + j))
                grid.pixels[pixelPos.x + i][pixelPos.y + j].type = PixelTypes.SAND;
        }
    }
};
function clear() {
    for (var x = 0; x < grid.width; x++) {
        for (var y = 0; y < grid.height; y++) {
            grid.pixels[x][y].type = PixelTypes.AIR;
        }
    }
}
clearButton.onclick = clear;
function setImage() {
    var tempCanvas = document.createElement('canvas');
    var ctx = tempCanvas.getContext('2d');
    if (!ctx)
        return;
    tempCanvas.width = grid.width;
    tempCanvas.height = grid.height;
    if (!imageInput.files || !imageInput.files[0])
        return;
    var reader = new FileReader();
    reader.onload = function (e) {
        var _a;
        var imageUrl = (_a = e.target) === null || _a === void 0 ? void 0 : _a.result;
        if (!imageUrl)
            return;
        var img = document.createElement('img');
        img.src = imageUrl;
        img.onload = function () {
            ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            for (var x = 0; x < tempCanvas.width; x++) {
                for (var y = 0; y < tempCanvas.height; y++) {
                    var imageData = ctx.getImageData(x, y, 1, 1);
                    var pixelData = imageData.data;
                    grid.pixels[x][y].colour = RGBAToHexA(pixelData[0], pixelData[1], pixelData[2], pixelData[3]);
                    // grid.pixels[x][y].type = PixelTypes.SAND
                }
            }
        };
    };
    reader.readAsDataURL(imageInput.files[0]);
}
setImageButton.onclick = setImage;
function loop() {
    grid.step();
    if (ctx) {
        grid.render(ctx);
    }
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
