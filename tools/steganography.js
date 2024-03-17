const ImageInput1 = document.getElementById('imageInput1')
const ImageInput2 = document.getElementById('imageInput2')
const EmbedButton = document.getElementById('embedButton')
const ExtractButton = document.getElementById('extractButton')
const SaveButton = document.getElementById('saveButton')
const InputCanvas1 = document.getElementById('inputCanvas1')
const InputCanvas2 = document.getElementById('inputCanvas2')
const OutputCanvas1 = document.getElementById('outputCanvas1')
const OutputCanvas2 = document.getElementById('outputCanvas2')

const InputCTX1 = InputCanvas1.getContext('2d')
const InputCTX2 = InputCanvas2.getContext('2d')
const OutputCTX1 = OutputCanvas1.getContext('2d')
const OutputCTX2 = OutputCanvas2.getContext('2d')

let image2Width = 0
let image2Height = 0

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
        embedImages(image1, image2)
    }
}

function embedImages(image1, image2) {
    InputCanvas1.width = image1.width
    InputCanvas1.height = image1.height

    InputCTX1.drawImage(image1, 0, 0, image1.width, image1.height)

    const image2AspectRatio = image2.width / image2.height;

    let targetPixelCountToEmbed = Math.floor((image1.width * image1.height) / 8)
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
    image2Width = targetWidth
    image2Height = targetHeight

    InputCTX2.drawImage(image2, 0, 0, targetWidth, targetHeight)
    
    let imageData1 = InputCTX1.getImageData(0, 0, InputCanvas1.width, InputCanvas1.height)
    let imageData2 = InputCTX2.getImageData(0, 0, InputCanvas2.width, InputCanvas2.height)

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
    OutputCanvas2.width = 10
    OutputCanvas2.height = 10

    OutputCTX1.putImageData(imageData1, 0, 0)
}

ExtractButton.onclick = function() {
    if (!ImageInput1.files || !ImageInput1.files[0]) return
    let imageFile = ImageInput1.files[0]
    let fileReader = new FileReader()
    let image = new Image()
    image.onload = function() {
        let fileName = imageFile.name.split('.')[0]
        let width = fileName.split(' ')[0]
        let height = fileName.split(' ')[1]
        extractImages(image, width, height)
    }
    fileReader.onloadend = function() {
        image.src = fileReader.result
    }
    fileReader.readAsDataURL(imageFile)
}

function extractImages(image, width, height) {
    InputCanvas1.width = image.width
    InputCanvas1.height = image.height
    InputCanvas2.width = 10
    InputCanvas2.height = 10

    InputCTX1.drawImage(image, 0, 0)

    let imageData1 = InputCTX1.getImageData(0, 0, InputCanvas1.width, InputCanvas1.height)

    let extractedImageData = new ImageData(width, height)
    for (let i = 0; i < extractedImageData.data.length; i += 4) {
        let r = 0, g = 0, b = 0, a = 0
        for (let j = 0; j < 8; j++) {
            r = (r << 1) | (imageData1.data[i * 8 + j * 4] & 1);
            g = (g << 1) | (imageData1.data[i * 8 + j * 4 + 1] & 1);
            b = (b << 1) | (imageData1.data[i * 8 + j * 4 + 2] & 1);
            a = (a << 1) | (imageData1.data[i * 8 + j * 4 + 3] & 1);
        }
        if (r == 0 && g == 0 && b == 0 && a == 0) {
            console.log(i, extractedImageData.data.length)
            break
        }
        extractedImageData.data[i] = r
        extractedImageData.data[i + 1] = g
        extractedImageData.data[i + 2] = b
        extractedImageData.data[i + 3] = a
        if (i == extractedImageData.data.length - 4) {
            console.log(
                extractedImageData.data[i],
                extractedImageData.data[i + 1],
                extractedImageData.data[i + 2],
                extractedImageData.data[i + 3]
            )
        }
    }
    
    OutputCTX2.putImageData(extractedImageData, 0, 0)
    
    OutputCanvas1.width = image.width
    OutputCanvas1.height = image.height
    OutputCanvas2.width = width
    OutputCanvas2.height = height

    OutputCTX1.putImageData(imageData1, 0, 0)
    OutputCTX2.putImageData(extractedImageData, 0, 0)
}

SaveButton.onclick = function() {
    let link = document.createElement('a')
    link.setAttribute('download', `${image2Width} ${image2Height}.png`)
    link.setAttribute('href', OutputCanvas1.toDataURL('image/png').replace('image/png', 'image/octet-stream'))
    link.click()
    link.remove()
}
