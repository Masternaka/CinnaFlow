/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The tiling model and feature direction are inspired by Tiling Shell:
 * https://github.com/domferr/tilingshell
 */

const Extension = imports.ui.extension;
const Me = Extension.getCurrentExtension();
const TilingExtension = Me.imports.lib.tilingExtension.TilingExtension;

let extension = null;

function init(metadata) {
    extension = new TilingExtension(metadata);
}

function enable() {
    extension.enable();
    // Cinnamon resolves settings-schema.json button callbacks on the object
    // returned by enable() (see ExtensionSystem.get_object_for_uuid).
    return extension;
}

function disable() {
    extension.disable();
}
