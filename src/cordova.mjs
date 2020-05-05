import fs from "fs-extra"
import path from "path"
import et from "elementtree"

import { options } from "@anzar/build"


class CordovaWebpackPlugin {
    constructor(options) {
        this.configXml = options.config
        this.cordovaRoot = options.root
        this.icon = options.icon

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
        compiler.hooks.afterEmit.tapAsync("CordovaWebpackPlugin", (compilation, callback) => {
            try {
                this.updateConfig(".", {
                    attributes: {
                        "version": options.__VERSION__
                    }
                })
                this.updateConfig("./name", { data: options.TITLE })
                this.updateConfig("./author", {
                    attributes: {
                        "email": options.pkg.author.email,
                        "href": options.pkg.author.url,
                    },
                    data: options.pkg.author.name
                })
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
}


export { CordovaWebpackPlugin }
