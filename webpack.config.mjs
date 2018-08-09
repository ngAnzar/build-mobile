import path from "path"
import url from "url"

import webpack from "webpack"
import HtmlWebpackPlugin from "html-webpack-plugin"

import { config, options } from "@anzar/build"

options.setAll({
    __PLATFORM__: "mobile",
    FEAT_CSS_VARIABLES: false,
    TITLE: "App is loading..."
})


export default config("@anzar/build-browser", {
    target: "web",
    output: {
        path: path.join(options.project_path, "www", "[__MODE__]")
    },
    whenMode: {
        development(cfg, key) {
            return {
                devServer: {
                    contentBase: path.join(options.project_path, "dist", "[__MODE__]"),
                    port: 4200,
                    historyApiFallback: true
                }
            }
        }
    },
    constants: {
        __DEV_SERVER__(cfg, key) {
            if (cfg.devServer) {
                let dvs = cfg.devServer
                return url.format({
                    protocol: dvs.https ? "https" : "http",
                    hostname: dvs.host ? dvs.host : "localhost",
                    port: dvs.port
                })
            } else {
                return null
            }
        }
    }
})
