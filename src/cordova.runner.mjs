import { spawn } from "child_process"

import { cli, options } from "@anzar/build"


export class CordovaRunner extends cli.AbstractRunner {
    init(app) {
        // app.args.addArgument(
        //     ["--platform"],
        //     {
        //         choices: ["ios", "android"],
        //         required: true
        //     }
        // )
    }

    async run(args) {
        // await this.spawn("cordova", ["prepare"])
        await this.spawn("cordova", ["requirements"])

        return this.spawn("cordova", ["run", "--emulate", "--target", "Pixel_2_API_26"])
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
