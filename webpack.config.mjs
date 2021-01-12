import path from "path"
import url from "url"

import { config, options } from "@anzar/build"


options.setAllDefault({
    FEAT_CSS_VARIABLES: false,
    TITLE: "App is loading..."
})


export default config("@anzar/build-browser", {})
