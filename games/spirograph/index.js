let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")
let menu = document.getElementById("menu")
let quantitySlider = document.getElementById("quantitySlider")
let scaleSlider = document.getElementById("scaleSlider")
let speedSlider = document.getElementById("speedSlider")
let pauseSwitch = document.getElementById("pauseSwitch")
let drawSwitch = document.getElementById("drawSwitch")
let invertedSwitch = document.getElementById("invertedSwitch")

class Circle {
    constructor(x, y, radius, angle) {
        this.x = x
        this.y = y
        this.radius = radius
        this.angle = angle
    }
}
class Point {
    constructor(x, y) {
        this.x = x
        this.y = y
    }
}

let canvasHeight = canvas.clientHeight
let canvasWidth = canvas.clientWidth

function onLoad() {
    adjustMenu()
    createNew()
}

function adjustMenu() {
    let sliderChildren = menu.querySelectorAll("input[type='range']")
    for (let index in sliderChildren) {
        let child = sliderChildren[index]
        if (!child.style)
            continue;
        child.style.height = child.clientWidth * 0.1
    }

    let labels = menu.querySelectorAll("label")
    labels[0].textContent = `Quantity: ${quantitySlider.value}`
    labels[1].textContent = `Scale: 1/${scaleSlider.value}`
    labels[2].textContent = `Speed: ${speedSlider.value}`
}

let circles

let currentInterval

let points = []

function createNew() {
    adjustMenu()
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    clearInterval(currentInterval)
    let quantity = parseInt(quantitySlider.value)
    let scale = parseFloat(scaleSlider.value)
    let speed = parseFloat(speedSlider.value)
    canvasHeight = canvas.clientHeight
    canvasWidth = canvas.clientWidth

    points = []
    circles = []

    let totalOffset = 0;
    for (let i = 0; i < quantity; i++) {
        let radius = canvasHeight/4 * Math.pow(1/scale, i)
        let nextRadius = radius * 1/scale
        let x = canvasWidth/2
        let y = canvasHeight/2 - totalOffset
        if (!invertedSwitch.checked) {
            totalOffset += nextRadius + radius
        } else {
            totalOffset += radius - nextRadius
        }
        let circle = new Circle(x, y, radius, -Math.PI/2);
        
        circle.speed = (Math.pow(speed, i - 1) * Math.PI / 180) / 10
        circles.push(circle)
        drawCircle(circle)
    }
    currentInterval = setInterval(function() {
        if (!pauseSwitch.checked) {
            createNext(circles)
        }
    }, 1)
}

function createNext(circles) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    let lastCircle = circles[circles.length - 1]
    points.push(
        new Point(
            lastCircle.x + lastCircle.radius * Math.cos(lastCircle.angle), 
            lastCircle.y + lastCircle.radius * Math.sin(lastCircle.angle)
        )
    )
    for (let i = 0; i < circles.length; i++) {
        drawCircle(circles[i])
        if (i - 1 < 0)
            continue;
        let parent = circles[i - 1]
        circles[i].angle += circles[i].speed;
        if (!invertedSwitch.checked) {
            let rsum = circles[i].radius + parent.radius
            circles[i].x = parent.x + rsum * Math.cos(circles[i].angle) 
            circles[i].y = parent.y + rsum * Math.sin(circles[i].angle)
        } else {
            let rsub = parent.radius - circles[i].radius
            circles[i].x = parent.x + rsub * Math.cos(circles[i].angle)
            circles[i].y = parent.y + rsub * Math.sin(circles[i].angle)
        }
    }
    if (!drawSwitch.checked) 
        return;
    ctx.moveTo(points[0].x, points[0].y)
    ctx.beginPath()
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
}

quantitySlider.addEventListener("change", function() {
    clearInterval(currentInterval)
    createNew()
})
scaleSlider.addEventListener("change", function() {
    clearInterval(currentInterval)
    createNew()
}) 
speedSlider.addEventListener("change", function() {
    clearInterval(currentInterval)
    createNew()
})

invertedSwitch.addEventListener("change", function() {
    clearInterval(currentInterval)
    createNew()
})

document.body.addEventListener("resize", function() {
    adjustMenu()
}

function drawCircle(circle) {
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI)
    ctx.stroke()
}

function resetAngle() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    for (let i = 0; i < circles.length; i++) {
        circles[i].angle = -Math.PI/2
        drawCircle(circles[i])
    }
    if (!drawSwitch.checked)
        return
    ctx.moveTo(points[0].x, points[0].y)
    ctx.beginPath()
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
}

/*

setInterval(function() {
    if (circles[0].angle > 0 && circles[0].angle < 1) {
        clearInterval(currentInterval)
    }
}, 100)

*/
