const Canvas = document.getElementById("canvas")
const CTX = Canvas.getContext("2d")

const Gravity = 1

var Columns = 50
var Rows = 50

const Width = Canvas.clientWidth / Columns
const Height = Canvas.clientHeight / Rows


Math.clamp = function(x, a, b) {
    return Math.min(Math.max(x, a), b)
}

function generate2dArray(width, height) {
    let array = new Array(width)
    for (let i = 0; i < array.length; i++) {
        array[i] = new Array(height)
        for (let j = 0; j < array[i].length; j++) {
            array[i][j] = new Pixel(0, i, j)
        }
    }
    return array
}

function inGrid(x = 0, y = 0) {
    return (x >= 0 && x <= Columns - 1) && (y >= 0 && y <= Rows - 1)
}

let selectedType = 1

const PixelDataDict = {
    0: {
        "Name": "Air",
        "Weight": 0,
        "Flammability": 1,
        "State": "Gas",
        "Colours": [
            undefined
        ]
    },
    1: {
        "Name": "Sand",
        "Weight": 1.5,
        "State": "Solid",
        "Colours": [
            "rgba(217, 190, 98, 1)"
        ]
    },
    2: {
        "Name": "Water",
        "Weight": 1,
        "SpreadFactor": 3,
        "State": "Liquid",
        "Colours": [
            'rgba(0, 128, 255, 1)',
            'rgba(51, 153, 255, 1)',
            'rgba(102, 178, 255, 1)'
          ]
    },
    3: {
        "Name": "Wood",
        "Weight": 0,
        "State": "Solid",
        "Colours": [
            "rgba(161, 102, 47, 1)"
        ]
    },
    4: {
        "Name": "Smoke",
        "Weight": -1,
        "State": "Gas",
        "Colours": [
            "rgba(216, 216, 216, 0.8)",
            "rgba(177, 177, 177, 0.8)",
            "rgba(126, 126, 126, 0.8)",
            "rgba(71, 71, 71, 0.8)",
            "rgba(26, 26, 26, 0.7)"
        ]
    }
}

class Pixel {
    constructor(Type, x, y) {
        const PixelData = PixelDataDict[Type]
        this.Type = Type
        this.Weight = PixelData.Weight
        this.State = PixelData.State
        this.Vx = 0
        this.Vy = 0
        this.x = x
        this.y = y
        this.Colour = PixelData.Colours[Math.floor(Math.random() * PixelData.Colours.length)]
        this.LastUpdated = Date.now()
        if (this.State == "Liquid") {
            this.SpreadFactor = PixelData.SpreadFactor
        }
    }
    

    Update() {
        const DT = Date.now() - this.LastUpdated
        this.LastUpdated = Date.now()
        const oldPos = [this.x, this.y]
        if (this.Type == 0) return

        if ( //Optimisation
            this.State != "Gas" &&
            (!inGrid(this.x - 1, this.y - 1) || grid[this.x - 1][this.y - 1].State == this.State) && 
            (!inGrid(this.x, this.y - 1) || grid[this.x][this.y - 1].State == this.State) &&
            (!inGrid(this.x + 1, this.y - 1) || grid[this.x + 1][this.y - 1].State == this.State) &&
            (!inGrid(this.x - 1, this.y) || grid[this.x - 1][this.y].State == this.State) &&
            (!inGrid(this.x + 1, this.y) || grid[this.x + 1][this.y].State == this.State) &&
            (!inGrid(this.x - 1, this.y + 1) || grid[this.x - 1][this.y + 1].State == this.State) &&
            (!inGrid(this.x, this.y + 1) || grid[this.x][this.y + 1].State == this.State) &&
            (!inGrid(this.x + 1, this.y + 1) || grid[this.x + 1][this.y + 1].State == this.State)
        ) return

        let lowest = this //Lowest non-air block
        let depth = 1
        while (true) {
            if (!inGrid(this.x, this.y + depth)) break
            lowest = grid[this.x][this.y + depth]
            if (lowest.Type != 0) break
            depth += 1
        }

        let dir = Math.random() < 0.5 ? 1 : -1

        let bottomA = undefined
        let bottomB = undefined
        let sideA = undefined
        let sideB = undefined
        let gravityDirection = Math.sign(this.Weight)

        if (inGrid(this.x + dir, this.y + gravityDirection)) {
            bottomA = grid[this.x + dir][this.y + gravityDirection]
        }
        if (inGrid(this.x - dir, this.y + gravityDirection)) {
            bottomB = grid[this.x - dir][this.y + gravityDirection]
        }
        if (inGrid(this.x + dir, this.y)) {
            sideA = grid[this.x + dir][this.y]
        }
        if (inGrid(this.x - dir, this.y)) {
            sideB = grid[this.x - dir][this.y]
        }
        if (this.Vy == 0 && inGrid(this.x, this.y + gravityDirection) && grid[this.x][this.y + gravityDirection].State == "Gas") {
            this.Vy += gravityDirection
        }

        if (inGrid(this.x, this.y + gravityDirection) && ((grid[this.x][this.y + gravityDirection].State == "Gas" && grid[this.x][this.y + gravityDirection].Type != this.Type) || lowest.State == "Gas" && lowest.Type != this.Type)) {
            this.Vx = 0
            this.Vy += (this.Weight * Gravity) * (DT / 100)
            this.ApplyVelocity()
        } else if (inGrid(this.x - 1, this.y + gravityDirection) && grid[this.x - 1][this.y + gravityDirection].State == "Gas" && grid[this.x - 1][this.y + gravityDirection].Type != this.Type) {
            this.Vx = -1
            this.Vy = this.Vx * Math.sign(this.Vx) * gravityDirection
            this.ApplyVelocity()
        } else if (inGrid(this.x + 1, this.y + gravityDirection) && grid[this.x + 1][this.y + gravityDirection].State == "Gas" && grid[this.x + 1][this.y + gravityDirection].Type != this.Type) {
            this.Vx = 1
            this.Vy = this.Vx * Math.sign(this.Vx) * gravityDirection
            this.ApplyVelocity()

        } else if (this.State == "Liquid") {
            let flowDirection = this.determineWaterFlow()
            this.Vx = flowDirection * this.SpreadFactor
            this.Vy = 0
            this.ApplyVelocity()
            // if (sideA != undefined && sideA.State == "Gas") {
            //     this.Vx = dir * this.SpreadFactor
            //     this.Vy = 0
            //     this.ApplyVelocity()
            // } else if (sideB != undefined && sideB.State == "Gas") {
            //     this.Vx = -dir * this.SpreadFactor
            //     this.Vy = 0
            //     this.ApplyVelocity()
            // }
        } else {
            this.Vx = 0
            this.Vy = 0
        }
        this.x = Math.clamp(this.x, 0, Columns)
        this.y = Math.clamp(this.y, 0, Rows)
        if (oldPos[0] != this.x || oldPos[1] != this.y) {
            grid[oldPos[0]][oldPos[1]] = new Pixel(0, oldPos[0], oldPos[1])
        }
        grid[this.x][this.y] = this
    }

    ApplyVelocity() {
        let velocitySlope;
        if (this.Vy === 0) {
            velocitySlope = Infinity;
        } else {
            velocitySlope = this.Vx / this.Vy;
        }
        let newX = this.x;
        let newY = this.y;
        let maxDistance = Math.max(Math.abs(this.Vx), Math.abs(this.Vy));
        if (this.Vy === 0) {
            for (let i = 0; i < Math.abs(this.Vx); i++) {
                let x = Math.round(this.x + (this.Vx >= 0 ? i : -i));
                let y = this.y;
    
                if (!inGrid(x, y) || ((grid[x][y].State !== "Gas" || this.Type == grid[x][y].Type) && grid[x][y] !== this && (x !== this.x || y !== this.y)))
                    break;

                //Do particle swap stuff here for solids going through water

                newX = x;
                newY = y;
            }
        } else {
            for (let i = 0; i <= maxDistance; i++) {
                let x = Math.round(this.x + (velocitySlope === Infinity ? 0 : i * velocitySlope));
                let y = Math.round(this.y + (this.Vy >= 0 ? i : -i));
    
                if (!inGrid(x, y) || ((grid[x][y].State !== "Gas" || this.Type == grid[x][y].Type) && grid[x][y] !== this && (x !== this.x || y !== this.y)))
                    break;
    
                //Do particle swap stuff here for solids going through water

                newX = x;
                newY = y;
            }
        }
        this.x = newX;
        this.y = newY;
    }

    determineWaterFlow() {
        let maxDepthLeft = 0;
        let maxDepthRight = 0;
    
        // Check neighboring columns to the left
        for (let i = this.x - 1; i >= 0; i--) {
            if (grid[i][this.y].State === "Gas") {
                // Determine depth based on row number
                let depth = 0;
                for (let j = this.y; j < Rows; j++) {
                    if (grid[i][j].State !== "Gas") {
                        depth = j;
                        break;
                    }
                }
                if (depth > maxDepthLeft) {
                    maxDepthLeft = depth;
                }
            } else {
                break; // Stop checking if encountered non-gas pixel
            }
        }
    
        // Check neighboring columns to the right
        for (let i = this.x + 1; i < Columns; i++) {
            if (grid[i][this.y].State === "Gas") {
                // Determine depth based on row number
                let depth = 0;
                for (let j = this.y; j < Rows; j++) {
                    if (grid[i][j].State !== "Gas") {
                        depth = j;
                        break;
                    }
                }
                if (depth > maxDepthRight) {
                    maxDepthRight = depth;
                }
            } else {
                break; // Stop checking if encountered non-gas pixel
            }
        }
    
        // Determine overall flow direction
        if (maxDepthLeft > maxDepthRight) {
            return -1; // Flow to the left
        } else if (maxDepthLeft < maxDepthRight) {
            return 1; // Flow to the right
        } else {
            return 0; // No flow or equal depths
        }
    }
}

let grid = generate2dArray(Columns, Rows)

function updateGrid() {
    for (let k = 0; k < 1; k++) {
        for (let y = Columns - 1; y > -1; y--) {
            for (let x = 0; x < Rows; x++) {
                let currentPixel = grid[x][y]
                if (currentPixel.Type == 0) continue
                currentPixel.Update()
            }
        }
    }
}

function drawGrid() {
    CTX.fillStyle = "#ffffff"
    CTX.fillRect(0, 0, Width * Columns, Height * Rows)
    for (let i = 0; i < Rows; i++) {
        for (let j = 0; j < Columns; j++) {
            if (grid[i][j].Type == 0) continue
            CTX.fillStyle = grid[i][j].Colour
            CTX.fillRect(i * Width, j * Height, Width, Height)
        }
    }
}

function run() {
    updateGrid()
    drawGrid()
    window.requestAnimationFrame(run)
}
window.requestAnimationFrame(run)

let mouseDown = false
document.onmousedown = function(event) {
    if (event.button != 0) return
    mouseDown = true
}
document.onmouseup = function(event) {
    if (event.button != 0) return
    mouseDown = false
}

document.onkeyup = function(event) {
    if (parseInt(event.key) > 0 && parseInt(event.key) <= 4) {
        selectedType = parseInt(event.key) - 1
    }
}

let mousePosition = []

document.onmousemove = function(event) {
    let boundingRect = Canvas.getBoundingClientRect()
    let mouseX = event.clientX - boundingRect.left
    let mouseY = event.clientY - boundingRect.top
    mousePosition = [mouseX, mouseY]
}

setInterval(function() {
    if (mouseDown == 0) return
    let gridPositionX = Math.floor(mousePosition[0] / Width)
    let gridPositionY = Math.floor(mousePosition[1] / Height)
    if (!inGrid(gridPositionX, gridPositionY)) return
    if (grid[gridPositionX][gridPositionY] == undefined) return
    if (grid[gridPositionX][gridPositionY].Type == selectedType) return
    grid[gridPositionX][gridPositionY] = new Pixel(selectedType, gridPositionX, gridPositionY)
}, 10)
