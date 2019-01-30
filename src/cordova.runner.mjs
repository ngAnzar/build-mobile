import path from "path"
import { spawn } from "child_process"
import ncp from "ncp"


import { cli, options } from "@anzar/build"


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

        await app.waitFor("webpack")

        await this.spawn(cordova, ["requirements"], { cwd })
        await this.copy(outPath, path.join(cwd, "www"))

        switch (args.subcommand) {
            case "build":
                await this.spawn(cordova, ["build", options.__PLATFORM__], { cwd })

                let outModifier = options.__MODE__ === "production" ? "" : "debug"
                await this.copy(path.join(cwd, "platforms", options.__PLATFORM__, "app", "build", "outputs", "apk", outModifier, `app-${outModifier}.apk`), path.join(outPath, `app.apk`))
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
