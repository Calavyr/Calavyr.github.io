const ImageInput1 = document.getElementById('imageInput1')
const ImageInput2 = document.getElementById('imageInput2')
const EmbedButton = document.getElementById('embedButton')
const ExtractButton = document.getElementById('extractButton')
const SaveButton = document.getElementById('saveButton')
const InputCanvas1 = document.getElementById('inputCanvas1')
const InputCanvas2 = document.getElementById('inputCanvas2')
const OutputCanvas1 = document.getElementById('outputCanvas1')

const InputCTX1 = InputCanvas1.getContext('2d')
const InputCTX2 = InputCanvas2.getContext('2d')
const OutputCTX1 = OutputCanvas1.getContext('2d')

let lastOperationWasEmbed = false
let lastFile1 = null

EmbedButton.onclick = function() {
    if (!ImageInput1.files || !ImageInput1.files[0] || !ImageInput2.files || !ImageInput2.files[0]) return
    let imageFile1 = ImageInput1.files[0]
    let imageFile2 = ImageInput2.files[0]

    let loadedImages = 0

    let fileReader1 = new FileReader()
    let fileReader2 = new FileReader()

    let image1 = new Image()
    let image2 = new Image()

    image1.onload = function() {
        loadedImages++
        executeOnBothLoaded()
    }
    fileReader1.onloadend = function() {
        image1.src = fileReader1.result
    }
    fileReader1.readAsDataURL(imageFile1)
    
    image2.onload = function() {
        loadedImages++
        executeOnBothLoaded()
    }
    fileReader2.onloadend = function() {
        image2.src = fileReader2.result
    }
    fileReader2.readAsDataURL(imageFile2)

    function executeOnBothLoaded() {
        if (loadedImages < 2) return
        lastFile1 = imageFile1
        embedImages(image1, image2)
    }
}

function embedImages(image1, image2) {
    lastOperationWasEmbed = true
    InputCanvas1.width = image1.width
    InputCanvas1.height = image1.height

    InputCTX1.drawImage(image1, 0, 0, image1.width, image1.height)

    const image2AspectRatio = image2.width / image2.height;

    let targetPixelCountToEmbed = Math.min(Math.floor((image1.width * image1.height) / 8), 65535) //The maximum pixel count of the embedded image is one eighth of the visible image or the maximum value shown by 2 bytes
    let targetWidth = Math.sqrt(targetPixelCountToEmbed * image2AspectRatio)
    let targetHeight = targetWidth / image2AspectRatio

    if (targetWidth > image2.width || targetHeight > image2.height) {
        if (image2.width > image2.height) {
            targetWidth = image2.width * Math.sqrt(targetPixelCountToEmbed / (image2.width * image2.height))
            targetHeight = targetWidth / image2AspectRatio
        } else {
            targetHeight = image2.height * Math.sqrt(targetPixelCountToEmbed / (image2.width * image2.height))
            targetWidth = targetHeight * image2AspectRatio
        }
    }
    targetWidth = Math.floor(targetWidth)
    targetHeight = Math.floor(targetHeight)
    InputCanvas2.width = targetWidth
    InputCanvas2.height = targetHeight

    InputCTX2.drawImage(image2, 0, 0, targetWidth, targetHeight)
    
    let imageData1 = InputCTX1.getImageData(0, 0, InputCanvas1.width, InputCanvas1.height)
    let imageData2 = InputCTX2.getImageData(0, 0, InputCanvas2.width, InputCanvas2.height)

    let valuesToEncode = [targetWidth.toString(2).padStart(16, '0'), targetHeight.toString(2).padStart(16, '0')]
    for (let i = 0; i < 2; i++) { //For both width and height
        let valueToEncode = valuesToEncode[i]

        for (let j = 0; j < 16; j++) { //For two bytes to store up to 65535 as width/height value
            imageData1.data[i * 16 + j] = (imageData1.data[i * 16 + j] & 0xFD) | ((valueToEncode[j] & 1) << 1);
        }
    }

    for (let i = 0; i < imageData2.data.length; i += 4) {
        const sourceR = imageData2.data[i];
        const sourceG = imageData2.data[i + 1];
        const sourceB = imageData2.data[i + 2];
        const sourceA = imageData2.data[i + 3];
        for (let j = 0; j < 8; j++) {
            imageData1.data[i * 8 + j * 4] = (imageData1.data[i * 8 + j * 4] & 0xFE) | ((sourceR >> (7 - j)) & 1);
            imageData1.data[i * 8 + j * 4 + 1] = (imageData1.data[i * 8 + j * 4 + 1] & 0xFE) | ((sourceG >> (7 - j)) & 1);
            imageData1.data[i * 8 + j * 4 + 2] = (imageData1.data[i * 8 + j * 4 + 2] & 0xFE) | ((sourceB >> (7 - j)) & 1);
            imageData1.data[i * 8 + j * 4 + 3] = (imageData1.data[i * 8 + j * 4 + 3] & 0xFE) | ((sourceA >> (7 - j)) & 1);
        }
    }

    OutputCanvas1.width = image1.width
    OutputCanvas1.height = image1.height

    OutputCTX1.putImageData(imageData1, 0, 0)
}

ExtractButton.onclick = function() {
    if (!ImageInput1.files || !ImageInput1.files[0]) return
    let imageFile = ImageInput1.files[0]
    let fileReader = new FileReader()
    let image = new Image()
    image.onload = function() {
        lastFile1 = imageFile
        extractImages(image)
    }
    fileReader.onloadend = function() {
        image.src = fileReader.result
    }
    fileReader.readAsDataURL(imageFile)
}

function extractImages(image) {
    lastOperationWasEmbed = false

    InputCanvas1.width = image.width
    InputCanvas1.height = image.height
    InputCanvas2.width = 10
    InputCanvas2.height = 10

    InputCTX1.drawImage(image, 0, 0)

    let imageData1 = InputCTX1.getImageData(0, 0, InputCanvas1.width, InputCanvas1.height)

    let width = 0
    let height = 0

    for (let i = 0; i < 2; i++) { //For both width and height
        let decodedValue = ''
        for (let j = 0; j < 16; j++) { //Get the two bytes storing the values
            let byte = imageData1.data[i * 16 + j]
            let bit = (byte >> 1) & 1;
            decodedValue += bit.toString()
        }
        if (i == 0) { //Width
            width = parseInt(decodedValue, 2)
        } else { //Height
            height = parseInt(decodedValue, 2)
        }
    }

    let extractedImageData = new ImageData(width, height)
    for (let i = 0; i < extractedImageData.data.length; i += 4) {
        let r = 0, g = 0, b = 0, a = 0
        for (let j = 0; j < 8; j++) {
            r = (r << 1) | (imageData1.data[i * 8 + j * 4] & 1);
            g = (g << 1) | (imageData1.data[i * 8 + j * 4 + 1] & 1);
            b = (b << 1) | (imageData1.data[i * 8 + j * 4 + 2] & 1);
            a = (a << 1) | (imageData1.data[i * 8 + j * 4 + 3] & 1);
        }
        extractedImageData.data[i] = r
        extractedImageData.data[i + 1] = g
        extractedImageData.data[i + 2] = b
        extractedImageData.data[i + 3] = a
    }
    
    OutputCanvas1.width = extractedImageData.width
    OutputCanvas1.height = extractedImageData.height

    OutputCTX1.putImageData(extractedImageData, 0, 0)
}

SaveButton.onclick = function() {
    let link = document.createElement('a')
    let name = ''
    let fileNameArrayNoExtension = lastFile1.name.split('.')
    fileNameArrayNoExtension.pop()
    let fileNameNoExtension = fileNameArrayNoExtension.join('.')
    if (lastOperationWasEmbed) {
        name = fileNameNoExtension + ' embedded'
    } else {
        name = fileNameNoExtension + ' extracted'
    }
    link.setAttribute('download', `${name}.png`)
    link.setAttribute('href', OutputCanvas1.toDataURL('image/png').replace('image/png', 'image/octet-stream'))
    link.click()
    link.remove()
}
