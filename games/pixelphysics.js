const Canvas = document.getElementById('canvas')
const CTX = Canvas.getContext('2d')

const Rows = 200
const Columns = 200
const Width = 5
const Height = 5

function make2dArray(rows, cols) {
    let array = []
    for (let i = 0; i < rows; i++) {
        array[i] = new Array(cols)
        for (let j = 0; j < cols; j++) {
            array[i][j] = new Pixel(0, i, j)
        }
    }
    return array
}

function inGrid(x, y) {
    return (x >= 0 && x <= Columns - 1) && (y >= 0 && y <= Rows - 1)
}

function generateDepthGrid() {
    let depthGrid = new Array(Columns)
    for (let i = 0; i < Columns; i++) {
        let depth = 0
        while (true) {
            if (!inGrid(i, Columns - depth - 1)) break
            if (grid[i][Columns - depth - 1].State == "Gas") break
            depth += 1
        }
        depthGrid[i] = depth
    }
}

function getDepth(x, breakStates) {
    let depth = 0
    while (true) {
        if (!inGrid(x, Columns - depth - 1)) break
        if (breakStates.includes(grid[x][Columns - depth - 1].State)) break
        depth += 1
    }
    return depth
}

Math.clamp = function(x, min, max) {
    return Math.min(Math.max(x, min), max)
}

const PixelNames = {
    0: "Air",
    1: "Sand",
    2: "Water",
    3: "Oil",
    4: "Fire",
    5: "Smoke"
}
const PixelColours = {
    "Air": "rgba(0, 0, 0, 0)",
    "Sand": "rgba(217, 209, 98, 1)",
    "Water": "rgba(35, 137, 218, 4)",
    "Oil": "rgba(0, 5, 10, 1)",
    "Fire": "rgba(255, 60, 0, 3)",
    "Smoke": "rgba(128, 128, 128, 2)"
}
const PixelStates = {
    "Air": "Gas",
    "Sand": "Solid",
    "Water": "Liquid",
    "Oil": "Liquid",
    "Fire": "Gas",
    "Smoke": "Gas"
}
let hueValue = 0
class Pixel {
    constructor(TypeId, x, y) {
        this.TypeId = TypeId
        this.TypeName = PixelNames[this.TypeId]
        this.Colour = PixelColours[this.TypeName]
        if (this.Colour[this.Colour.length - 2] == "2" && this.Colour[this.Colour.length - 3] == " ") {
            let newColour = this.Colour.split(", ")
            newColour[3] = Math.clamp(Math.random() / 2, 0, 1) + ")"
            this.Colour = newColour.join(", ")
        }
        if (this.Colour[this.Colour.length - 2] == "3" && this.Colour[this.Colour.length - 3] == " ") {
            let newColour = this.Colour.split(", ")
            newColour[3] = Math.clamp(Math.random() + 0.7, 0, 1) + ")"
            this.Colour = newColour.join(", ")
        }
        if (this.Colour[this.Colour.length - 2] == "4" && this.Colour[this.Colour.length - 3] == " ") {
            let newColour = this.Colour.split(", ")
            newColour[3] = Math.clamp(Math.random() + 0.6, 0, 0.9) + ")"
            this.Colour = newColour.join(", ")
        }
        this.State = PixelStates[this.TypeName]
        this.x = x
        this.y = y
    }

    Update() {
        let affectedPixels = []
        if (!inGrid(this.x, this.y)) {
            grid[this.x][this.y] = new Pixel(0, this.x, this.y)
            return
        }

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

        let oldPos = [this.x, this.y]
        let below = grid[this.x][this.y + 1]
        let above = grid[this.x][this.y - 1]
        let lowest = this
        let depth = 1

        while (true) {
            if (!inGrid(this.x, this.y + depth)) break
            lowest = grid[this.x][this.y + depth]
            if (lowest.TypeId != 0) break
            depth += 1
        }
        if (this.State == "Solid") {
            let dir = Math.random() < 0.5 ? 1 : -1

            let bottomA = undefined
            let bottomB = undefined
            if (inGrid(this.x + dir, this.y + 1)) {
                bottomA = grid[this.x + dir][this.y + 1]
            }
            if (inGrid(this.x - dir, this.y + 1)) {
                bottomB = grid[this.x - dir][this.y + 1]
            }
            if (below != undefined && (below.State == "Gas" || lowest.State == "Gas")) {
                this.y += 1
            } else if (below != undefined && (below.State == "Liquid" || below.State == "Gas")) {
                below.y = this.y
                this.y += 1
            } else if (bottomA != undefined && bottomA.TypeId == 0) {
                this.x += dir
                this.y += 1
            } else if (bottomB != undefined && bottomB.TypeId == 0) {
                this.x -= dir
                this.y += 1
            } else if (bottomA != undefined && bottomA.State == "Solid") {
                bottomA.Update()
            } else if (bottomB != undefined && bottomB.State == "Solid") {
                bottomB.Update()
            }
        }
        if (this.State == "Gas") {
            let dir = Math.random() < 0.5 ? 1 : -1

            let topA = undefined
            let topB = undefined
            if (inGrid(this.x + dir, this.y - 1)) {
                topA = grid[this.x + dir][this.y - 1]
            }
            if (inGrid(this.x - dir, this.y - 1)) {
                topB = grid[this.x - dir][this.y - 1]
            }
            if (above != undefined && above.TypeId == 0 && Math.random() < 0.5) {
                this.y -= 1
            } else if (topA != undefined && topA.TypeId == 0) {
                this.x += dir
                this.y -= 1
            } else if (topB != undefined && topB.TypeId == 0) {
                this.x -= dir
                this.y -= 1
            } else {
                let Distance = Math.floor(Math.random() * (3 + 3) - 3)
                if (inGrid(this.x + Distance, this.y) && grid[this.x + Distance][this.y].TypeId == 0) {
                    this.x += Distance
                }
            }
            if (this.y == 0) {
                this.x = -1
                this.y = -1
            }
        }
        if (this.State == "Liquid") {
            let dir = Math.random() < 0.5 ? 1 : -1

            let bottomA = undefined
            let bottomB = undefined
            if (inGrid(this.x + dir, this.y + 1)) {
                bottomA = grid[this.x + dir][this.y + 1]
            }
            if (inGrid(this.x - dir, this.y + 1)) {
                bottomB = grid[this.x - dir][this.y + 1]
            }
            if (below != undefined && (below.State == "Gas" || lowest.State == "Gas")) {
                this.y += 1
            } else if (bottomA != undefined && bottomA.TypeId == 0) {
                this.x += dir
                this.y += 1
            } else if (bottomB != undefined && bottomB.TypeId == 0) {
                this.x -= dir
                this.y += 1
            } else if (bottomA != undefined && bottomA.State == "Liquid") {
                bottomA.Update()
            } else if (bottomB != undefined && bottomB.State == "Liquid") {
                bottomB.Update()
            }
        }
        if (this.x != oldPos[0] || this.y != oldPos[1]) {
            affectedPixels.push(new Pixel(0, oldPos[0], oldPos[1]))
        }
        

        for (let i in affectedPixels) {
            let affectedPixel = affectedPixels[i]
            if (!inGrid(affectedPixel.x, affectedPixel.y)) continue
            grid[affectedPixel.x][affectedPixel.y] = affectedPixel
        }
        if (inGrid(this.x, this.y)) {
            if (grid[this.x][this.y].State == "Liquid") {
                grid[this.x][oldPos[1]] = grid[this.x][this.y]
            }
            grid[this.x][this.y] = this
        } else {
            grid[oldPos[0]][oldPos[1]] = new Pixel(0, oldPos[0], oldPos[1])
        }
    }

    SwapPixel(OtherPixel) {
        let Temp = this
        this.x = OtherPixel.x
        this.y = OtherPixel.y
        OtherPixel.x = Temp.x
        OtherPixel.y = Temp.y
    }
}

let grid = make2dArray(Rows, Columns)

function updateGrid() {
    for (let i = Rows - 1; i > -1; i--) {
        for (let j = Columns - 1; j > -1; j--) {
            let currentPixel = grid[i][j]
            let oldPos = [currentPixel.x, currentPixel.y]
            if (currentPixel.TypeId == 0) continue
            currentPixel.Update()
        }
    }
}

function drawGrid() {
    CTX.fillStyle = "#ffffff"
    CTX.fillRect(0, 0, Width * Columns, Height * Rows)
    for (let i = 0; i < Rows; i++) {
        for (let j = 0; j < Columns; j++) {
            if (grid[i][j].TypeId == 0) continue
            CTX.fillStyle = grid[i][j].Colour
            CTX.fillRect(i * Width, j * Height, Width, Height)
        }
    }
}

drawGrid()

function run() {
    updateGrid()
    drawGrid()
    window.requestAnimationFrame(run)
}

window.requestAnimationFrame(run)


let mouseDown = 0
document.onmousedown = function(event) {
    if (event.button == 0) {
        mouseDown = 1
    } else if (event.button == 1) {
        mouseDown = 5
    } else if (event.button == 4) {
        mouseDown = 2
    }
}
document.onmouseup = function(event) {
    mouseDown = 0
}

Canvas.onmousemove = function(event) {
    if (mouseDown == 0) return
    let boundingRect = Canvas.getBoundingClientRect()
    let mouseX = event.clientX - boundingRect.left
    let mouseY = event.clientY - boundingRect.top

    let gridPositionX = Math.floor(mouseX / Width)
    let gridPositionY = Math.floor(mouseY / Height)
    for (let i = -3; i < 3; i++) {
        for (let j = -3; j < 3; j++) {
            if (!grid[gridPositionX + i]) break
            if (grid[gridPositionX + i][gridPositionY + j] == undefined) continue
            grid[gridPositionX + i][gridPositionY + j] = new Pixel(mouseDown, gridPositionX + i, gridPositionY + j)
        }
    }
}