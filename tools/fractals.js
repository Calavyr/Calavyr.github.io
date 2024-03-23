const Canvas = document.getElementById('canvas')
const CTX = Canvas.getContext('2d')

const Menu = document.getElementById('menu')

const LengthInput = document.getElementById('lengthInput')
const WidthInput = document.getElementById('widthInput')
const ScaleInput = document.getElementById('scaleInput')
const RotationInput = document.getElementById('rotationInput')
const SidesInput = document.getElementById('sidesInput')
const BranchesInput = document.getElementById('branchesInput')
const ForksInput = document.getElementById('forksInput')
const DepthInput = document.getElementById('depthInput')
const ShadowCheckbox = document.getElementById('shadowBlurInput')

const DrawButton = document.getElementById('drawButton')

let drawing = false

function drawFractal(maxLevel) {
    CTX.setTransform(1, 0, 0, 1, 0, 0)
    CTX.translate(Canvas.width / 2, Canvas.height / 2)
    CTX.rotate((-90 * Math.PI) / 180)
    
    CTX.shadowColor = '#' + Math.floor(Math.random()*16777215).toString(16)
    CTX.shadowBlur = ShadowCheckbox.checked ? 50 : 0

    CTX.lineWidth = WidthInput.value
    CTX.strokeStyle = '#' + Math.floor(Math.random()*16777215).toString(16)
    
    let length = LengthInput.value
    let scale = ScaleInput.value
    let rotationDegrees = RotationInput.value

    let radiansRotation = (rotationDegrees * Math.PI) / 180
    let doubleRadiansRotation = 2 * radiansRotation

    let sides = SidesInput.value
    let branches = BranchesInput.value
    let forks = ForksInput.value

    drawing = true

    let singleFork = forks == 1
    let LengthOverBranches = length / branches
    let forksMinusOneReciprocal = 1 / (forks - 1)
    function drawBranch(level) {
        if (level > maxLevel) {
            drawing = false
            return
        }
        drawing = true
        CTX.beginPath()
        CTX.moveTo(0, 0)
        CTX.lineTo(length, 0)
        CTX.stroke()

        for (let i = 0; i < branches; i++) {
            let translate = length - LengthOverBranches * i
            for (let j = 0; j < forks; j++) {
                let rotation = singleFork ? radiansRotation : doubleRadiansRotation * (j * forksMinusOneReciprocal - 0.5)
                CTX.save()
                CTX.translate(translate, 0)
                CTX.rotate(rotation)
                CTX.scale(scale, scale)
                drawBranch(level + 1)
                CTX.restore()
            }
        }
    }
    for (let i = 0; i < sides; i++) {
        CTX.rotate((Math.PI * 2) / sides)
        drawBranch(0)
    }
}

function totalLoops(maxLevel, sides, branches, forks) {
    let total = 0
    function calculateLoops(level) {
        if (level > maxLevel) {
            return
        }
        total += sides * branches * forks
        for (let i = 0; i < sides; i++) {
            calculateLoops(level + 1)
        }
    }
    calculateLoops(0)
    return total
}

let inputsConnected = false

function resizeCanvas() {
    Canvas.clientLeft = 0
    Canvas.clientTop = 0
    Canvas.width = window.innerWidth
    Canvas.height = window.innerHeight
    CTX.lineCap = 'round'
    let inputs = Menu.querySelectorAll('input')
    let labels = Menu.querySelectorAll('label')

    for (let i = 0; i < inputs.length; i++) {
        inputs[i].style.top = i * 6 + 1 + '%'
        labels[i].style.top = i * 6 + '%'
        
        if (!inputsConnected) {
            let defaultText = labels[i].textContent
            inputs[i].oninput = function() {
                if (inputs[i].type == 'range') {
                    labels[i].textContent = defaultText + inputs[i].value + ':'
                } else {
                    labels[i].textContent = defaultText + inputs[i].checked + ':'
                }
            }
            inputs[i].oninput()
        }
    }
    inputsConnected = true
}

DrawButton.onclick = function() {
    console.log('A')
    if (drawing) return
    drawFractal(DepthInput.value)
}

document.body.onresize = resizeCanvas
