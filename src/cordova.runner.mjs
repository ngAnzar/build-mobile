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
        const gradlew = "gradlew" + (isWin ? ".bat" : "")
        // TODO: valami config
        const cwd = path.join(options.project_path, "cordova")
        const outPath = options.out_path
        const isServe = args.subcommand === "serve"

        await fs.mkdirp(path.join(cwd, "platforms"))
        await fs.mkdirp(path.join(cwd, "plugins"))
        await fs.mkdirp(path.join(cwd, "www"))

        await app.waitFor("webpack", "compiled")

        try {
            await this.spawn(cordova, ["platform", "add", options.__PLATFORM__], { cwd })
        } catch (e) {
            // pass, if platform already presented, this command is returned with error
        }

        await this.spawn(cordova, ["requirements", options.__PLATFORM__], { cwd })

        await fs.copy(outPath, path.join(cwd, "www"))
        await this.spawn(cordova, ["prepare", options.__PLATFORM__], { cwd })

        this.emit("prepared")

        if (isServe) {
            app.runners.webpack.on("compiled", () => {
                // console.log(`copy compiled to: ${path.join(cwd, "www")}`)
                fs.copySync(outPath, path.join(cwd, "www"))
                // this.spawn(cordova, ["run", options.__PLATFORM__], { cwd })
            })

            // await this.spawn(cordova, ["run", options.__PLATFORM__], { cwd })
        } else {
            let buildArgs = ["compile", options.__PLATFORM__]
            let buildMode = "debug"

            if (options.__ENV__ === "development") {
                buildArgs.push("--debug")
            } else {
                buildArgs.push("--release")
                buildMode = "release"
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
                    await fs.copy(v, path.join(outPath, "..", `${options.__ENV__}.apk`))
                    break
                } catch (e) {

                }
            }

            if (options.__ENV__ !== "development" && options.__PLATFORM__ === "android") {
                const gradlewCwd = path.join(cwd, "platforms", "android")
                await this.spawn(path.join(gradlewCwd, gradlew), ["bundleRelease"], { cwd: gradlewCwd })
                let aabName = buildMode === "release" ? "app-release.aab" : "app.aab"
                await fs.copy(path.join(gradlewCwd, "app", "build", "outputs", "bundle", "release", aabName), path.join(outPath, "..", `${options.__ENV__}.aab`))
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
}
