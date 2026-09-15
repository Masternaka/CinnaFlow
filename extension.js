/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * The tiling model and feature direction are inspired by Tiling Shell:
 * https://github.com/domferr/tilingshell
 */

const Main = imports.ui.main;
const Settings = imports.ui.settings;
const PopupMenu = imports.ui.popupMenu;
const St = imports.gi.St;
const Meta = imports.gi.Meta;

const UUID = 'cinnamon-tiling-shell@local';

/* Normalized rectangles make layouts independent of monitor resolution. */
const LAYOUTS = {
    'two-columns': [
        { x: 0, y: 0, width: 0.5, height: 1 },
        { x: 0.5, y: 0, width: 0.5, height: 1 },
    ],
    'main-stack': [
        { x: 0, y: 0, width: 0.62, height: 1 },
        { x: 0.62, y: 0, width: 0.38, height: 0.5 },
        { x: 0.62, y: 0.5, width: 0.38, height: 0.5 },
    ],
    'three-columns': [
        { x: 0, y: 0, width: 1 / 3, height: 1 },
        { x: 1 / 3, y: 0, width: 1 / 3, height: 1 },
        { x: 2 / 3, y: 0, width: 1 / 3, height: 1 },
    ],
    grid: [
        { x: 0, y: 0, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0, width: 0.5, height: 0.5 },
        { x: 0, y: 0.5, width: 0.5, height: 0.5 },
        { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ],
};

function TilingExtension(metadata) {
    this._init(metadata);
}

TilingExtension.prototype = {
    _init(metadata) {
        this.metadata = metadata;
        this.settings = null;
        this._indicator = null;
        this._menu = null;
        this._assignments = new Map();
        this._originalRects = new Map();
        this._hotkeys = [];
    },

    enable() {
        this.settings = new Settings.ExtensionSettings(this, UUID);
        this.settings.bindProperty(Settings.BindingDirection.IN,
            'show-indicator', 'showIndicator', this._syncIndicator.bind(this), null);
        this._installHotkeys();
        this._syncIndicator();
    },

    disable() {
        this._removeHotkeys();
        this._destroyIndicator();
        this._assignments.clear();
        this._originalRects.clear();
        this.settings = null;
    },

    _installHotkeys() {
        const bindings = [
            ['tile-left', 'left'], ['tile-right', 'right'],
            ['tile-up', 'up'], ['tile-down', 'down'],
        ];
        bindings.forEach(([key, direction]) => {
            const name = `${UUID}-${key}`;
            Main.keybindingManager.addHotKey(name, this.settings.getValue(key),
                () => this.tileFocusedWindow(direction));
            this._hotkeys.push(name);
        });
    },

    _removeHotkeys() {
        this._hotkeys.forEach(name => Main.keybindingManager.removeHotKey(name));
        this._hotkeys = [];
    },

    _syncIndicator() {
        if (this.showIndicator) {
            if (!this._indicator)
                this._createIndicator();
        } else {
            this._destroyIndicator();
        }
    },

    _createIndicator() {
        this._indicator = new St.Bin({
            style_class: 'panel-button', reactive: true, can_focus: true, track_hover: true,
        });
        this._indicator.set_child(new St.Icon({
            icon_name: 'view-grid-symbolic', style_class: 'system-status-icon',
        }));
        this._menu = new PopupMenu.PopupMenu(this._indicator, 0.0, St.Side.TOP);
        Main.uiGroup.add_actor(this._menu.actor);
        this._menu.actor.hide();
        this._indicator.connect('button-press-event', () => {
            this._rebuildMenu();
            this._menu.toggle();
            return true;
        });
        // Cinnamon has a PanelManager (and may have several panels), unlike GNOME Shell.
        const panelManager = Main.panelManager || Main.panel;
        const panel = panelManager.getPanel
            ? panelManager.getPanel(Main.layoutManager.primaryIndex, 0) ||
              panelManager.getPanel(Main.layoutManager.primaryIndex, 1)
            : panelManager;
        panel._rightBox.insert_child_at_index(this._indicator, 0);
    },

    _destroyIndicator() {
        if (this._menu) {
            this._menu.destroy();
            this._menu = null;
        }
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    },

    _rebuildMenu() {
        this._menu.removeAll();
        const labels = {
            'two-columns': 'Deux colonnes',
            'main-stack': 'Colonne principale et pile',
            'three-columns': 'Trois colonnes',
            grid: 'Grille 2 x 2',
        };
        Object.keys(LAYOUTS).forEach(id => {
            const item = new PopupMenu.PopupMenuItem(
                `${this.settings.getValue('layout') === id ? '✓ ' : ''}${labels[id]}`);
            item.connect('activate', () => {
                this.settings.setValue('layout', id);
            });
            this._menu.addMenuItem(item);
        });
        this._menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const untile = new PopupMenu.PopupMenuItem('Restaurer la fenetre active');
        untile.connect('activate', () => this.untileFocusedWindow());
        this._menu.addMenuItem(untile);
    },

    tileFocusedWindow(direction) {
        const window = global.display.get_focus_window();
        if (!this._canTile(window))
            return;

        const layout = LAYOUTS[this.settings.getValue('layout')] || LAYOUTS['two-columns'];
        const currentIndex = this._assignments.get(window);
        const tileIndex = this._findTile(layout, currentIndex, direction);
        this._tileWindow(window, layout[tileIndex], tileIndex);
    },

    untileFocusedWindow() {
        const window = global.display.get_focus_window();
        if (!window || !this._originalRects.has(window))
            return;
        const rect = this._originalRects.get(window);
        window.move_resize_frame(true, rect.x, rect.y, rect.width, rect.height);
        this._assignments.delete(window);
        this._originalRects.delete(window);
    },

    _canTile(window) {
        return window && window.get_window_type() === Meta.WindowType.NORMAL && !window.is_fullscreen();
    },

    _findTile(layout, currentIndex, direction) {
        if (currentIndex === undefined) {
            if (direction === 'left') return 0;
            if (direction === 'right') return layout.length - 1;
            return 0;
        }
        const current = layout[currentIndex];
        const centerX = current.x + current.width / 2;
        const centerY = current.y + current.height / 2;
        let candidate = currentIndex;
        let distance = Infinity;
        layout.forEach((tile, index) => {
            if (index === currentIndex) return;
            const x = tile.x + tile.width / 2;
            const y = tile.y + tile.height / 2;
            const isDirection = (direction === 'left' && x < centerX) ||
                (direction === 'right' && x > centerX) ||
                (direction === 'up' && y < centerY) ||
                (direction === 'down' && y > centerY);
            const d = (x - centerX) ** 2 + (y - centerY) ** 2;
            if (isDirection && d < distance) {
                candidate = index;
                distance = d;
            }
        });
        return candidate;
    },

    _tileWindow(window, tile, index) {
        if (!this._originalRects.has(window))
            this._originalRects.set(window, window.get_frame_rect());
        window.unmaximize(Meta.MaximizeFlags.BOTH);
        const workArea = this._getWorkArea(window.get_monitor());
        const outer = this.settings.getValue('outer-gap');
        const gap = this.settings.getValue('gap');
        const x = Math.round(workArea.x + outer + tile.x * (workArea.width - 2 * outer));
        const y = Math.round(workArea.y + outer + tile.y * (workArea.height - 2 * outer));
        const width = Math.round(tile.width * (workArea.width - 2 * outer) - gap);
        const height = Math.round(tile.height * (workArea.height - 2 * outer) - gap);
        window.move_resize_frame(true, x, y, Math.max(1, width), Math.max(1, height));
        this._assignments.set(window, index);
    },

    _getWorkArea(monitor) {
        if (global.display.get_work_area_for_monitor)
            return global.display.get_work_area_for_monitor(monitor);
        if (global.screen.get_monitor_workarea)
            return global.screen.get_monitor_workarea(monitor);
        return Main.layoutManager.getWorkAreaForMonitor(monitor);
    },
};

function init(metadata) {
    return new TilingExtension(metadata);
}
