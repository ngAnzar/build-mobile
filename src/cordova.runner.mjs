import path from "path"
import { spawn } from "child_process"
import ncp from "ncp"
import mkdirp from "mkdirp"


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
        const outPath = path.join(options.project_path, "dist", options.__MODE__)

        mkdirp.sync(path.join(cwd, "platforms"))
        mkdirp.sync(path.join(cwd, "plugins"))
        mkdirp.sync(path.join(cwd, "www"))

        if (fancyOutputEnabled()) {
            await app.waitFor("webpack")
        }

        try {
            await this.spawn(cordova, ["platform", "add", options.__PLATFORM__], { cwd })
        } catch (e) {
            // pass, if platform already presented, this command is returned with error
        }

        await this.spawn(cordova, ["requirements"], { cwd })
        await this.copy(outPath, path.join(cwd, "www"))

        if (!fancyOutputEnabled()) {
            await app.waitFor("webpack")
        }

        switch (args.subcommand) {
            case "build":
                let buildArgs = ["build", options.__PLATFORM__]
                let buildMode = "debug"

                if (options.__MODE__ === "production") {
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
                        await this.copy(v, path.join(outPath, `app.apk`))
                        break
                    } catch (e) {

                    }
                }

                break

            case "serve":
                break
        }


        // await this.spawn("cordova", ["prepare"])


        // return this.spawn("cordova", ["run", "--emulate", "--target", "Pixel_2_API_26"])
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

    async copy(src, dst) {
        return new Promise((resolve, reject) => {
            ncp(src, dst, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve()
                }
            })
        })
    }
}
