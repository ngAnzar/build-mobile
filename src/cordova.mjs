import fs from "fs-extra"
import path from "path"
import et from "elementtree"
import semverParse from "semver/functions/parse"

import { options } from "@anzar/build"
import { resizeImage, createSplashScreen } from "./image"
import { ANDROID_ICON } from "./appicon"
import { ANDROID_SPLASH } from "./splashscreen"


class CordovaWebpackPlugin {
    constructor(options) {
        this.configXml = options.config
        this.cordovaRoot = options.root
        this.icon = options.icon
        this.splash = options.splash
        this.preferences = options.preferences

        this._configUpdates = []
    }

    /**
     * path = xpath /root/child/...
     * options =
     *      {
     *          children: [
     *              {
     *                  tag: "{http://schemas.android.com/apk/res/android}anything",
     *                  attributes: {
     *                      "{http://schemas.android.com/apk/res/android}usesCleartextTraffic": "true"
     *                  }
     *              }
     *          ],
     *          attributes: {
     *              "{http://schemas.android.com/apk/res/android}usesCleartextTraffic": "true",
     *              "{http://schemas.android.com/apk/res/android}usesCleartextTraffic": null,
     *          },
     *          data: "..."
     *      }
     */
    updateConfig(path, options) {
        this._configUpdates.push({ path, options })
    }

    apply(compiler) {
        compiler.hooks.emit.tapAsync("CordovaWebpackPlugin", (compilation, callback) => {
            this._generateAssets().then(callback, (e) => {
                console.log(e)
                callback(e)
            })
        })

        compiler.hooks.afterEmit.tapAsync("CordovaWebpackPlugin", (compilation, callback) => {
            try {
                this.updateConfig(".", { attributes: this._getVersionAttrs() })
                this.updateConfig("./name", { data: options.TITLE })
                this.updateConfig("./author", {
                    attributes: {
                        "email": options.pkg.author.email,
                        "href": options.pkg.author.url,
                    },
                    data: options.pkg.author.name
                })

                if (this.preferences) {
                    for (const k in this.preferences) {
                        if (this.preferences.hasOwnProperty(k)) {
                            this.updateConfig(".", {
                                children: [
                                    {
                                        tag: "preference",
                                        attributes: {
                                            name: k,
                                            value: this.preferences[k]
                                        }
                                    }
                                ]
                            })
                        }
                    }
                }

            } catch (e) {
                console.log(e, e.stack)
                callback(e)
                return
            }

            this._applyUpdates().then(callback, (e) => {
                console.log(e)
                callback(e)
            })
        })
    }

    async _applyUpdates() {
        const xml = await fs.readFile(this.configXml, "utf-8")
        const tree = et.parse(xml)

        for (const update of this._configUpdates) {
            this._applyUpdate(tree, update.path, update.options)
        }
        this._configUpdates.length = 0

        const updated = tree.write({
            encoding: "utf-8",
            indent: 4
        })

        await fs.writeFile(path.join(this.cordovaRoot, "config.xml"), updated)
    }

    _applyUpdate(tree, path, options) {
        for (const el of tree.findall(path)) {
            if (options.attributes) {
                for (const k in options.attributes) {
                    this._applyAttributeUpdate(el, k, options.attributes[k])
                }
            }
            if (options.children) {
                for (const child of options.children) {
                    const childEl = et.SubElement(el, child.tag, child.attributes)
                    if (child.data) {
                        childEl.text = child.data
                    }
                }
            }
            if (options.hasOwnProperty("data")) {
                el.text = options.data
            }
        }
    }

    _applyAttributeUpdate(el, name, value) {
        for (const attrName in el.attrib) {
            if ((attrName instanceof et.QName && attrName.text === name) || attrName === name) {
                if (value == null) {
                    delete el.attrib[attrName]
                } else {
                    el.attrib[attrName] = value
                }
                return
            }
        }
        el.attrib[name] = value
    }

    async _generateAssets() {
        if (this.icon) {
            await this._generateIcons()
        }

        if (this.splash) {
            await this._generateSplash()
        }
    }

    async _generateIcons() {
        const bgColorRes = `<?xml version="1.0" encoding="utf-8"?>\n<resources><color name="AppIconBg">${this.icon.background}</color></resources>`
        const bgColorResDir = path.join(this.cordovaRoot, "res", "values")

        await fs.mkdirp(bgColorResDir)
        await fs.writeFile(path.join(bgColorResDir, "AppIconColor.xml"), bgColorRes)
        this.updateConfig("./platform[@name='android']", {
            children: [{
                tag: "resource-file",
                attributes: {
                    "src": "res/values/AppIconColor.xml",
                    "target": "/app/src/main/res/values/AppIconColor.xml"
                }
            }]
        })

        const outFolder = path.join(this.cordovaRoot, ANDROID_ICON.path)
        await fs.mkdirp(outFolder)
        let resized = await resizeImage(this.icon.path, outFolder, ANDROID_ICON.variants)

        for (const icon of resized) {
            this.updateConfig("./platform[@name='android']", {
                children: [{
                    tag: "icon",
                    attributes: {
                        "foreground": path.relative(this.cordovaRoot, icon.path),
                        "density": icon.variant.density,
                        "background": "@color/AppIconBg"
                    }
                }]
            })
        }
    }

    async _generateSplash() {
        const outFolder = path.join(this.cordovaRoot, ANDROID_SPLASH.path)
        await fs.mkdirp(outFolder)
        let resized = await createSplashScreen(this.splash.path, outFolder, ANDROID_SPLASH.variants, this.splash.background || "#FFFFFF")

        for (const splash of resized) {
            this.updateConfig("./platform[@name='android']", {
                children: [{
                    tag: "preference",
                    attributes: {
                        "name": "AndroidWindowSplashScreenAnimatedIcon",
                        "value": path.relative(this.cordovaRoot, splash.path),
                    }
                }]
            })
        }
    }

    _getVersionAttrs() {
        const version = semverParse(options.__VERSION__)

        let versionCode = `${version.major}${leadingZero(version.minor)}${leadingZero(version.patch)}`
        let pre = 99
        if (version.prerelease && version.prerelease.length) {
            if (version.prerelease[0] === "alpha") {
                pre = version.prerelease[1] || 0
            } else if (version.prerelease[0] === "beta") {
                pre = (version.prerelease[1] || 0) + 30
            } else if (version.prerelease[0] === "rc") {
                pre = (version.prerelease[1] || 0) + 60
            }
        }
        versionCode = `${versionCode}${leadingZero(pre)}`

        return {
            "version": options.__VERSION__,
            "android-versionCode": versionCode
        }

    }
}


function leadingZero(value) {
    if (value < 10) {
        return `0${value}`
    } else {
        return value.toString()
    }
}


export { CordovaWebpackPlugin }
