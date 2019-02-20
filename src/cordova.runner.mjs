import fs from "fs-extra"
import path from "path"
import { spawn } from "child_process"


import { cli, options, fancyOutputEnabled } from "@anzar/build"


export class CordovaRunner extends cli.AbstractRunner {
    name() {
        return "cordova"
    }

    init(app) {

    }

    async run(app, args) {
        const isWin = process.platform === "win32"
        const cordova = "cordova" + (isWin ? ".cmd" : "")
        // TODO: valami config
        const cwd = path.join(options.project_path, "cordova")
        const outPath = options.out_path
        const isServe = args.subcommand === "serve"

        await fs.mkdirp(path.join(cwd, "platforms"))
        await fs.mkdirp(path.join(cwd, "plugins"))
        await fs.mkdirp(path.join(cwd, "www"))
        await this.updateCordovaXml(options.package_json, path.join(cwd, "config.xml"))

        if (fancyOutputEnabled()) {
            await app.waitFor("webpack", "compiled")
        }

        try {
            await this.spawn(cordova, ["platform", "add", options.__PLATFORM__], { cwd })
        } catch (e) {
            // pass, if platform already presented, this command is returned with error
        }

        await this.spawn(cordova, ["requirements", options.__PLATFORM__], { cwd })

        if (!isServe && !fancyOutputEnabled()) {
            await app.waitFor("webpack", "compiled")
        }

        await fs.copy(outPath, path.join(cwd, "www"))
        await this.spawn(cordova, ["prepare", options.__PLATFORM__], { cwd })

        this.emit("prepared")

        if (isServe) {
            app.runners.webpack.on("compiled", () => {
                console.log(`copy compiled to: ${path.join(cwd, "www")}`)
                fs.copySync(outPath, path.join(cwd, "www"))
            })
            //browsersync
        } else {
            let buildArgs = ["compile", options.__PLATFORM__]
            let buildMode = "debug"

            if (options.__MODE__ === "production") {
                buildArgs.push("--release")
                buildMode = "release"
            } else {
                buildArgs.push("--debug")
            }

            await this.spawn(cordova, buildArgs, { cwd })

            let outputPath = path.join(cwd, "platforms", options.__PLATFORM__, "app", "build", "outputs", "apk", buildMode)
            let variants = [
                path.join(outputPath, `app-${buildMode}.apk`),
                path.join(outputPath, `app-${buildMode}-unsigned.apk`),
                path.join(outputPath, `app-${buildMode}-signed.apk`)
            ]

            for (const v of variants) {
                try {
                    await fs.copy(v, path.join(outPath, "..", `${options.__MODE__}.apk`))
                    break
                } catch (e) {

                }
            }

            this.emit("compiled")
        }
    }

    async spawn(program, args, options) {
        if (!options) {
            options = {}
        }

        if (!options.cwd) {
            options.cwd = options.project_path
        }

        if (!options.stdio) {
            options.stdio = "inherit"
        }

        let proc
        let promise = new Promise((resolve, reject) => {
            proc = spawn(program, args, options)
            proc.on("close", (code) => {
                if (code) {
                    reject(code)
                } else {
                    resolve(0)
                }
            })

            proc.on("error", (err) => {
                reject(err)
            })
        })

        promise.proc = proc
        return promise
    }

    async updateCordovaXml(packageJson, cordovaXml) {
        const pkg = await fs.readJson(packageJson)
        let xml = await fs.readFile(cordovaXml, "utf8")

        if (!pkg.author) {
            throw new Error(`Missing author field from ${packageJson}`)
        }

        xml = xml.replace(/(<widget[^<>]+)version=".*?"/mg, `$1version="${pkg.version}"`)
        xml = xml.replace(/<author[\s\S]*?<\/author>/m, `<author email="${pkg.author.email}" href="${pkg.author.url}">${pkg.author.name}</author>`)

        await fs.writeFile(cordovaXml, xml)
    }
}
