import path from "path"
import fs from "fs-extra"
import Jimp from "jimp"


async function resize(imageData, outputFile, w, h) {
    return Jimp.read(imageData).then(image => {
        return image
            .resize(w, h)
            .quality(100)
            .writeAsync(outputFile)
    })
}


export async function resizeImage(inputFile, outFolder, definitions) {
    const filename = path.basename(inputFile)
    const { name, ext } = path.parse(filename)

    const imageData = await fs.readFile(inputFile)
    let result = []

    for (const def of definitions) {
        const prefix = def.prefix || ""
        const suffix = def.suffix || ""
        const outName = def.name ? def.name : `${prefix}${name}${suffix}${ext}`
        const outPath = path.join(outFolder, outName)
        await resize(imageData, outPath, def.size, def.size)
        result.push({ path: outPath, variant: def })
    }

    return result
}


async function _createSplash(imageData, w, h, bg) {
    let image = await Jimp.create(w, h, bg)
    let original = await Jimp.read(imageData)
    if (original.getWidth() > w || original.getHeight() > h) {
        await original.scaleToFit(w, h)
    }

    await image.composite(original, (w - original.getWidth()) / 2, (h - original.getHeight()) / 2)
    return image
}


async function _createNinePatchSplash(imageData, w, h, bg) {
    let image = await Jimp.create(w + 2, h + 2, 0)
    // top left
    await image.setPixelColor(0x000000FF, 0, 1)
    await image.setPixelColor(0x000000FF, 1, 0)

    // top right
    await image.setPixelColor(0x000000FF, w, 0)

    // bottom left
    await image.setPixelColor(0x000000FF, 0, h)

    // right
    for (let y = 1; y < h + 1; y++) {
        await image.setPixelColor(0x000000FF, w + 1, y)
    }

    // bottom
    for (let x = 1; x < w + 1; x++) {
        await image.setPixelColor(0x000000FF, x, h + 1)
    }

    let scaleable = await _createSplash(imageData, w, h, bg)
    await image.composite(scaleable, 1, 1)

    return image
}


export async function createSplashScreen(inputFile, outFolder, definitions, backgroundColor) {
    const filename = path.basename(inputFile)
    const { name, ext } = path.parse(filename)

    const imageData = await fs.readFile(inputFile)
    let result = []

    for (const def of definitions) {
        const prefix = def.prefix || ""
        const suffix = def.suffix || ""
        const outName = def.name ? def.name : `${prefix}${name}${suffix}${ext}`
        const outPath = path.join(outFolder, outName)
        const image = def.ninePatch
            ? await _createNinePatchSplash(imageData, def.width, def.height, backgroundColor)
            : await _createSplash(imageData, def.width, def.height, backgroundColor)
        await image.quality(100).writeAsync(outPath)
        result.push({ path: outPath, variant: def })
    }

    return result
}
