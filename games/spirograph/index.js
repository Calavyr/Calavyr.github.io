let canvas = document.getElementById("canvas")
let ctx = canvas.getContext("2d")
let quantitySlider = document.getElementById("quantitySlider")
let scaleSlider = document.getElementById("scaleSlider")
let speedSlider = document.getElementById("speedSlider")

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
let circles

let currentInterval

let points = []

function createNew() {
    let quantity = parseInt(quantitySlider.value)
    let scale = parseFloat(scaleSlider.value)
    let speed = parseFloat(speedSlider.value)
    canvasHeight = canvas.clientHeight
    canvasWidth = canvas.clientWidth

    points = []
    circles = []

    let totalOffset = 0;
    for (let i = 0; i < quantity; i++) {
        let radius = canvasHeight/7.5 * Math.pow(scale, i);
        let x = canvasWidth/2
        let y = canvasHeight/2 - totalOffset
        totalOffset += radius * 1.5
        let circle = new Circle(x, y, radius, 0);
        
        circle.speed = Math.pow(speed, i)/(speed * speed * speed)
        circles.push(circle)
        drawCircle(circle, "black")
    }
    currentInterval = setInterval(function() {
        createNext(circles)
    }, 1)
}

function createNext(circles) {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    let lastCircle = circles[circles.length - 1]
    points.push(
        new Point(
            lastCircle.x + lastCircle.radius * Math.cos((lastCircle.angle - 90) * (Math.PI/180)), 
            lastCircle.y + lastCircle.radius * Math.sin((lastCircle.angle - 90) * (Math.PI/180))
        )
    )

    for (let i = 0; i < circles.length; i++) {
        drawCircle(circles[i])
        // circles[i].angle += circles[0].radius * 1/Math.pow(circles[i].radius, 2)
        circles[i].angle += circles[i].speed;
        for (let j = 1; j < circles.length; j++) {
            let parent = circles[j - 1]
            let thetaRad = (parent.angle - 90) * (Math.PI / 180)
            
            circles[j].x = parent.x + (circles[j].radius + parent.radius) * Math.cos(thetaRad)
            circles[j].y = parent.y + (circles[j].radius + parent.radius) * Math.sin(thetaRad)
        }
    }
    if (document.getElementById("drawSwitch").checked) 
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

function stop() {
    clearInterval(currentInterval)
}

function drawCircle(circle) {
    ctx.beginPath()
    ctx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI)
    ctx.stroke()
}

/*

setInterval(function() {
    if (circles[0].angle > 0 && circles[0].angle < 1) {
        clearInterval(currentInterval)
    }
}, 100)

*/
