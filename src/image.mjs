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


async function _createSplash(imageData, outputFile, w, h, bg) {
    let image = await Jimp.create(w, h, bg)
    let original = await Jimp.read(imageData)
    if (original.getWidth() > w || original.getHeight() > h) {
        await original.scaleToFit(w, h)
    }

    await image.composite(original, (w - original.getWidth()) / 2, (h - original.getHeight()) / 2)
    await image.quality(100).writeAsync(outputFile)
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
        await _createSplash(imageData, outPath, def.width, def.height, backgroundColor)
        result.push({ path: outPath, variant: def })
    }

    return result
}
