/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Main = imports.ui.main;
const St = imports.gi.St;

var PreviewOverlay = class PreviewOverlay {
    constructor() {
        this._actor = new St.Widget({
            style_class: 'tiling-preview-overlay',
            reactive: false,
        });
        Main.uiGroup.add_actor(this._actor);
        this._actor.hide();
    }

    show(geom) {
        if (!this._actor)
            return;
        this._actor.set_position(geom.x, geom.y);
        this._actor.set_size(geom.width, geom.height);
        this._actor.show();
    }

    hide() {
        if (this._actor)
            this._actor.hide();
    }

    destroy() {
        if (this._actor) {
            this._actor.destroy();
            this._actor = null;
        }
    }
};
