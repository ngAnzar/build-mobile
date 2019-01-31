import { cli } from "@anzar/build"

import { CordovaRunner } from "./cordova.runner"


const app = new cli.Application("anzar-mobile", [
    // new cli.WebpackRunner(),
    new CordovaRunner()
])

app.run()
