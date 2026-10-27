/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;

var IndicatorManager = class IndicatorManager {
    constructor(getPanelFunc) {
        this._getPanel = getPanelFunc;
        this._indicator = null;
        this._menu = null;
        this._menuManager = null;
    }

    sync(showIndicator, onRebuild) {
        if (showIndicator) {
            if (!this._indicator)
                this._create(onRebuild);
        } else {
            this.destroy();
        }
    }

    _create(onRebuild) {
        const panel = this._getPanel();
        if (!panel || !panel._rightBox)
            return;

        this._indicator = new St.Bin({
            style_class: 'panel-button cinnaflow-indicator',
            reactive: true,
            can_focus: true,
            track_hover: true,
        });
        this._indicator.set_child(new St.Icon({
            icon_name: 'view-grid-symbolic',
            style_class: 'system-status-icon',
        }));

        const arrowSide = panel.bottomPosition ? St.Side.BOTTOM : St.Side.TOP;
        // Cinnamon 6.x: PopupMenu(sourceActor, orientation). The GNOME-style
        // third `arrowSide` argument does not exist in this API.
        this._menu = new PopupMenu.PopupMenu(this._indicator, arrowSide);
        // PopupMenuManager uses `owner.actor` for modal grabs (Main.pushModal),
        // so the owner must expose an actor.
        this.actor = this._indicator;
        this._menuManager = new PopupMenu.PopupMenuManager(this);
        this._menuManager.addMenu(this._menu);

        Main.uiGroup.add_actor(this._menu.actor);
        this._menu.actor.hide();

        this._indicator.connect('button-press-event', () => {
            if (onRebuild)
                onRebuild(this._menu);
            this._menu.toggle();
            return true;
        });

        panel._rightBox.insert_child_at_index(this._indicator, 0);
    }

    destroy() {
        if (this._menuManager && this._menu) {
            this._menuManager.removeMenu(this._menu);
            this._menuManager = null;
        }
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }
};
