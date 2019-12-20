#!/usr/bin/env node

const NODE_MAJOR_VERSION = Number(process.versions.node.split(".")[0])

require("child_process").spawn(
    process.execPath,
    [
        "--no-warnings",
        "--experimental-modules",
        (NODE_MAJOR_VERSION >= 12 ? "--es-module-specifier-resolution=node" : null),
        require("path").join(__dirname, "cli.mjs"),
        ...process.argv.slice(2)
    ].filter(v => !!v),
    { stdio: "inherit" })
