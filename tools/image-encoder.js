const ImageInput = document.getElementById('imageInput')
const HorizontifyButton = document.getElementById('horizontifyButton')
const DehorizontifyButton = document.getElementById('dehorizontifyButton')
const SaveButton = document.getElementById('saveButton')
const OutputCanvas = document.getElementById('outputCanvas')
const InputCanvas = document.getElementById('inputCanvas')
let OutputCTX = OutputCanvas.getContext('2d')
let InputCTX = InputCanvas.getContext('2d')

let currentImageWidth = 0

HorizontifyButton.onclick = function() {
    if (!ImageInput.files || !ImageInput.files[0]) return
    let imageFile = ImageInput.files[0]
    let fileReader = new FileReader()
    let image = new Image()
    image.onload = function() {
        horizontify(image)
    }
    fileReader.onloadend = function() {
        image.src = fileReader.result
    }
    fileReader.readAsDataURL(imageFile)
}

function horizontify(image) {
    const aspectRatio = image.width / image.height;

    let targetWidth = Math.sqrt(65000 * aspectRatio);
    let targetHeight = targetWidth / aspectRatio;

    if (targetWidth > image.width || targetHeight > image.height) {
        if (image.width > image.height) {
            targetWidth = image.width * Math.sqrt(65000 / (image.width * image.height));
            targetHeight = targetWidth / aspectRatio;
        } else {
            targetHeight = image.height * Math.sqrt(65000 / (image.width * image.height));
            targetWidth = targetHeight * aspectRatio;
        }
    }
    InputCanvas.height = targetHeight
    InputCanvas.width = targetWidth
    currentImageWidth = InputCanvas.width

    InputCTX.drawImage(image, 0, 0, targetWidth, targetHeight)

    let imageDataObject = InputCTX.getImageData(0, 0, InputCanvas.width, InputCanvas.height)
    let imageData = imageDataObject.data

    OutputCanvas.height = 1
    OutputCanvas.width = (imageData.length / 4)

    for (let i = 0; i < InputCanvas.height; i++) {
        OutputCTX.drawImage(InputCanvas, 0, i, InputCanvas.width, 1, i * InputCanvas.width, 0, InputCanvas.width, 1)
    }
}

DehorizontifyButton.onclick = function() {
    if (!ImageInput.files || !ImageInput.files[0]) return
    let imageFile = ImageInput.files[0]
    let fileReader = new FileReader()
    let image = new Image()
    image.onload = function() {
        dehorizontify(image)
    }
    fileReader.onloadend = function() {
        image.src = fileReader.result
    }
    fileReader.readAsDataURL(imageFile)
}

function dehorizontify(image) {
    InputCanvas.height = image.height
    InputCanvas.width = image.width
    InputCTX.drawImage(image, 0, 0)

    const width = decodeIntFromImage(image)
    const height = image.width / width
    OutputCanvas.height = height
    OutputCanvas.width = width
    for (let i = 0; i < height; i++) {
        OutputCTX.drawImage(InputCanvas, i * width, 0, width, 1, 0, i, width, 1)
    }
}

SaveButton.onclick = function() {
    let link = document.createElement('a')
    link.setAttribute('download', `encoded.png`)
    console.log()
    let image = new Image()
    image.onload = function() {
        link.setAttribute('href', encodeIntIntoImage(image, currentImageWidth))
        link.click()
        link.remove()
    }
    image.src = OutputCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
}

function getPixelData(data, index) {
    return {
        R: data[index],
        G: data[index + 1],
        B: data[index + 2],
        A: data[index + 3] / 255
    }
}

function encodeIntIntoImage(image, integer) {
    const binaryInteger = integer.toString(2).padStart(16, '0')

    OutputCanvas.height = image.height
    OutputCanvas.width = image.width

    OutputCTX.drawImage(image, 0, 0)

    const imageData = OutputCTX.getImageData(0, 0, OutputCanvas.width, OutputCanvas.height)
    const pixels = imageData.data
    
    for (let i = 0; i < 16; i++) {
        pixels[i * 4 + 3] = (pixels[i * 4 + 3] & 0xFE) | parseInt(binaryInteger[i])
    }
    OutputCTX.putImageData(imageData, 0, 0)
    const encodedImage = OutputCanvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
    return encodedImage
}


function decodeIntFromImage(image) {
    InputCanvas.height = image.height
    InputCanvas.width = image.width

    InputCTX.drawImage(image, 0, 0)

    const imageData = InputCTX.getImageData(0, 0, InputCanvas.width, InputCanvas.height)
    const pixels = imageData.data

    let binary = ''
    for (let i = 0; i < 16; i++) {
        binary += (pixels[i * 4 + 3] & 0x01).toString()
    }
    const integer = parseInt(binary, 2)
    return integer
}
