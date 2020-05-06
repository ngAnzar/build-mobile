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
