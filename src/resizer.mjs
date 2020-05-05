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
        const outName = def.suffix ? `${name}${def.suffix}${ext}` : `${name}${ext}`
        const outPath = path.join(outFolder, outName)
        await resize(imageData, outPath, def.size, def.size)
        result.push(outPath)
    }

    return result
}
