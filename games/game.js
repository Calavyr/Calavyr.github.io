const canvas = document.createElement('canvas')
const w = canvas.width = 500
const h = canvas.height = 700
document.body.appendChild(canvas)
const ctx = canvas.getContext('2d')

const board = () => {
    ctx.beginPath()
    ctx.arc(w/2,h/2,w/10,0,2*Math.PI)
    ctx.moveTo(0,h/2)
    ctx.lineTo(w,h/2)
    ctx.moveTo(w/3, 0)
    ctx.rect(w/3, 0, w/3, h/20)
    ctx.moveTo(w/3, 0)
    ctx.rect(w/3, h-h/20 , w/3, h)
    ctx.font = '48px serif';
    ctx.fillText(computer.score, w/15, h/15)
    ctx.fillText(player.score, w/15, h - h/16)
    ctx.stroke()
}

window.addEventListener('mousemove', (e) => {
    player.x = e.x - window.innerWidth/2 + w/2
    player.y = e.y - h*.05
})

class Player {
    constructor() {
        this.x = undefined
        this.y = undefined
        this.prevX = undefined
        this.prevY = undefined
        this.dx = undefined
        this.dy = undefined
        this.score = 0
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y , w*.05 ,0 ,2*Math.PI)
        ctx.fillStyle = "red"
        ctx.fill()
        ctx.stroke()
    }

    update() {
        this.dx = this.x - this.prevX
        this.dy = this.y - this.prevY
        this.prevX = this.x
        this.prevY = this.y
    }

}

class Puck {

    constructor() {
        this.x = w/2
        this.y = h/2
        this.dx = 1
        this.dy = 1
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y , w*.04 ,0 ,2*Math.PI)
        ctx.fillStyle = "black"
        ctx.fill()
        ctx.stroke()
    }

    update() {
        this.x += this.dx
        this.y += this.dy

        const Pa = Math.abs(this.x - player.x)
        const Pb = Math.abs(this.y - player.y)
        const Pc = Math.sqrt(Pa**2 + Pb**2)
        const Ca = Math.abs(this.x - computer.x)
        const Cb = Math.abs(this.y - computer.y)
        const Cc = Math.sqrt(Ca**2 + Cb**2)


        if(this.y - w*.04 < 0) {

            if(this.x > w/3 && this.x < 2*w/3) {
                computer.score++
                puck.x = w/2
                puck.y = h/2
                puck.dx = 0
                puck.dy = 0
            } 

        } else if (this.y + w*.04 > h) {

            if(this.x > w/3 && this.x < 2*w/3) {
                player.score++
                puck.x = w/2
                puck.y = h/2
                puck.dx = 0
                puck.dy = 0
            } 
        }


        if(this.x + w*.04 > w || this.x - w*.04 < 0) {
            this.dx *= -1
        }

        if(this.y + w*.04 > h || this.y - w*.04 < 0) {
            this.dy *= -1
        }

        //vS + vP = vS' + vP' => VP' = vS + vP - cS'
        if(Pc < w*.04 + w*.05) {
            player.dx === 0 ? this.dx *= -1 : this.dx += player.dx * .5
            player.dy === 0 ? this.dy *= -1 : this.dy += player.dy * .5
        } else if (Cc < w*.04 + w*.05) {
            computer.dx === 0 ? this.dx *= -1 : this.dx += computer.dx * .5
            computer.dy === 0 ? this.dy *= -1 : this.dy += computer.dy * .5
        }

        Math.sign(this.dx) === 1 ? this.dx -= .1 : this.dx += .1
        Math.sign(this.dy) === 1 ? this.dy -= .1 : this.dy += .1
        
    }

}

class Computer {

    constructor() {
        this.x = w/4
        this.y = h/5
        this.dx = 3
        this.dy = 3
        this.homePosition = {
            x: w/2,
            y: h/10
        }
        this.score = 0
    }

    draw() {
        ctx.beginPath()
        ctx.arc(this.x, this.y , w*.05 ,0 ,2*Math.PI)
        ctx.fillStyle = "blue"
        ctx.fill()
        ctx.stroke()
    }

    update() {


        if (Math.sign(puck.dy) === 1) {
            this.retract()

        } else if (puck.y < this.y) {
            this.retract()

        } else if(Math.sign(puck.dy) === -1 && puck.y < h/2) {
            
            this.strike()

        }


    }

    strike() {
        
        const relativeX = puck.x - this.x
        const relativey = puck.y - this.y
        const theta = Math.atan(relativeX/relativey)
        const vector = 10 
        this.dx = vector*Math.sin(theta)
        this.dy = vector*Math.cos(theta)
        
        this.x += this.dx
        this.y += this.dy


    }

    retract() {
        this.dx = 3
        this.dy= 3
        this.x += this.x > this.homePosition.x ? this.dx*-1 : this.dx
        this.y += this.y > this.homePosition.y ? this.dy*-1 : this.dy
    }


}

const player = new Player
const puck = new Puck
const computer = new Computer

function animate() {
    ctx.clearRect(0,0,w,h)

    board()

    player.draw()
    player.update()

    puck.draw()
    puck.update()

    computer.draw()
    computer.update()
    
    requestAnimationFrame(animate)
}

animate()

