#!/usr/bin/env node

require("child_process").spawn(
    process.execPath,
    [
        "--experimental-modules",
        "--es-module-specifier-resolution=node",
        require("path").join(__dirname, "cli.mjs"),
        ...process.argv.slice(2)
    ],
    { stdio: "inherit" })
