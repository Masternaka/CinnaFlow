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
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;

const UUID = 'cinnamon-tiling-shell@local';

const LOG_PREFIX = '[CinnaFlow] ';

// Centralized logger: every message is prefixed so it can be grepped in
// ~/.xsession-errors. Debug traces are gated by the `debug` preference.
const Log = {
    _debugEnabled: false,

    setDebug(enabled) {
        this._debugEnabled = enabled === true;
    },

    debug(message) {
        if (this._debugEnabled)
            global.log(LOG_PREFIX + message);
    },

    warn(message) {
        global.logWarning(LOG_PREFIX + message);
    },

    error(message) {
        global.logError(LOG_PREFIX + message);
    },
};

class LayoutEngine {
    constructor() {
        this._presets = {
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

        this._presetLabels = {
            'two-columns': 'Deux colonnes',
            'main-stack': 'Colonne principale et pile',
            'three-columns': 'Trois colonnes',
            grid: 'Grille 2 x 2',
        };

        this.customDir = GLib.build_filenamev([GLib.get_user_config_dir(), 'cinnaflow', 'layouts']);
        this.loadCustomLayouts();
    }

    loadCustomLayouts() {
        this.layouts = { ...this._presets };
        this.labels = { ...this._presetLabels };

        try {
            const dirFile = Gio.File.new_for_path(this.customDir);
            if (!dirFile.query_exists(null)) {
                dirFile.make_directory_with_parents(null);
                this._createSampleLayout();
            }

            const enumerator = dirFile.enumerate_children(
                'standard::name,standard::type',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const filename = info.get_name();
                if (filename.endsWith('.json')) {
                    const child = dirFile.get_child(filename);
                    try {
                        const [ok, contents] = child.load_contents(null);
                        if (ok) {
                            const str = (typeof TextDecoder !== 'undefined')
                                ? new TextDecoder().decode(contents)
                                : (imports.byteArray ? imports.byteArray.toString(contents) : String(contents));
                            const data = JSON.parse(str);
                            this._parseLayoutData(data, filename);
                        }
                    } catch (err) {
                        Log.error(`Error parsing layout ${filename}: ${err}`);
                    }
                }
            }
            enumerator.close(null);
        } catch (e) {
            // Silently ignore if filesystem access is restricted
        }

        Log.debug(`${Object.keys(this.layouts).length} dispositions disponibles`);
    }

    _createSampleLayout() {
        try {
            const sample = {
                id: 'ultrawide-center',
                name: 'Centre large (Exemple)',
                tiles: [
                    { x: 0, y: 0, width: 0.22, height: 1 },
                    { x: 0.22, y: 0, width: 0.56, height: 1 },
                    { x: 0.78, y: 0, width: 0.22, height: 1 },
                ],
            };
            const sampleFile = Gio.File.new_for_path(
                GLib.build_filenamev([this.customDir, 'sample-ultrawide.json'])
            );
            sampleFile.replace_contents(
                JSON.stringify(sample, null, 4),
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
        } catch (e) {}
    }

    _parseLayoutData(data, filename) {
        if (Array.isArray(data)) {
            data.forEach(item => this._registerLayoutItem(item));
        } else if (data && typeof data === 'object') {
            this._registerLayoutItem(data, filename);
        }
    }

    _registerLayoutItem(item, filename) {
        if (!item || typeof item !== 'object')
            return;

        const rawId = item.id || (filename ? filename.replace(/\.json$/, '') : 'custom');
        const name = item.name || item.title || rawId;
        const rawTiles = item.tiles || item.rects || [];

        if (!Array.isArray(rawTiles) || rawTiles.length === 0)
            return;

        const validTiles = [];
        for (const t of rawTiles) {
            const x = Math.max(0, Math.min(1, Number(t.x) || 0));
            const y = Math.max(0, Math.min(1, Number(t.y) || 0));
            const width = Math.max(0.01, Math.min(1 - x, Number(t.width) || 0.5));
            const height = Math.max(0.01, Math.min(1 - y, Number(t.height) || 0.5));
            validTiles.push({ x, y, width, height });
        }

        if (validTiles.length > 0) {
            const id = 'custom-' + rawId;
            this.layouts[id] = validTiles;
            this.labels[id] = name;
        }
    }

    exportLayout(id, targetPath) {
        if (!this.layouts[id])
            return false;

        const data = {
            id: id,
            name: this.labels[id] || id,
            tiles: this.layouts[id],
        };

        try {
            const file = Gio.File.new_for_path(targetPath);
            file.replace_contents(
                JSON.stringify(data, null, 4),
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
            return true;
        } catch (e) {
            return false;
        }
    }

    get(id) {
        return this.layouts[id] || this.layouts['two-columns'];
    }

    getLabel(id) {
        return this.labels[id] || id;
    }

    getKeys() {
        return Object.keys(this.layouts);
    }

    findTile(layout, currentIndex, direction) {
        if (currentIndex === undefined || !layout[currentIndex]) {
            if (direction === 'left') return 0;
            if (direction === 'right') return layout.length - 1;
            if (direction === 'up') return 0;
            if (direction === 'down') return Math.min(layout.length - 1, 1);
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
    }

    findTileAt(layout, relX, relY) {
        for (let i = 0; i < layout.length; i++) {
            const tile = layout[i];
            if (relX >= tile.x && relX <= (tile.x + tile.width) &&
                relY >= tile.y && relY <= (tile.y + tile.height)) {
                return i;
            }
        }

        let best = 0;
        let bestDistance = Infinity;
        for (let i = 0; i < layout.length; i++) {
            const tile = layout[i];
            const cx = tile.x + tile.width / 2;
            const cy = tile.y + tile.height / 2;
            const d = (relX - cx) ** 2 + (relY - cy) ** 2;
            if (d < bestDistance) {
                bestDistance = d;
                best = i;
            }
        }
        return best;
    }

    calculateGeometry(tile, workArea, outer, gap) {
        const availWidth = workArea.width - 2 * outer;
        const availHeight = workArea.height - 2 * outer;

        const isLeft = tile.x <= 0.001;
        const isRight = (tile.x + tile.width) >= 0.999;
        const isTop = tile.y <= 0.001;
        const isBottom = (tile.y + tile.height) >= 0.999;

        const tileLeft = isLeft
            ? (workArea.x + outer)
            : (workArea.x + outer + tile.x * availWidth + gap / 2);

        const tileRight = isRight
            ? (workArea.x + workArea.width - outer)
            : (workArea.x + outer + (tile.x + tile.width) * availWidth - gap / 2);

        const tileTop = isTop
            ? (workArea.y + outer)
            : (workArea.y + outer + tile.y * availHeight + gap / 2);

        const tileBottom = isBottom
            ? (workArea.y + workArea.height - outer)
            : (workArea.y + outer + (tile.y + tile.height) * availHeight - gap / 2);

        const x = Math.round(tileLeft);
        const y = Math.round(tileTop);
        const width = Math.max(1, Math.round(tileRight - tileLeft));
        const height = Math.max(1, Math.round(tileBottom - tileTop));

        return { x, y, width, height };
    }
}

class WindowTracker {
    constructor() {
        this._assignments = new Map();
        this._originalStates = new Map();
        this._windowSignals = new Map();
    }

    getAssignment(window) {
        return this._assignments.get(window);
    }

    hasOriginalState(window) {
        return this._originalStates.has(window);
    }

    getOriginalState(window) {
        return this._originalStates.get(window);
    }

    register(window, tileIndex, monitor) {
        if (!this._originalStates.has(window)) {
            const wasMaximized = window.get_maximized
                ? (window.get_maximized() === Meta.MaximizeFlags.BOTH)
                : false;
            this._originalStates.set(window, {
                rect: window.get_frame_rect(),
                wasMaximized: wasMaximized,
            });
        }

        if (!this._windowSignals.has(window)) {
            const signalId = window.connect('unmanaged', () => {
                this.cleanup(window);
            });
            this._windowSignals.set(window, signalId);
        }

        this._assignments.set(window, { monitor, index: tileIndex });
    }

    cleanup(window) {
        if (this._windowSignals.has(window)) {
            const signalId = this._windowSignals.get(window);
            try {
                window.disconnect(signalId);
            } catch (e) {
                // Window might already be destroyed
            }
            this._windowSignals.delete(window);
        }
        this._assignments.delete(window);
        this._originalStates.delete(window);
    }

    disconnectAll() {
        for (const [window, signalId] of this._windowSignals) {
            try {
                window.disconnect(signalId);
            } catch (e) {
                // Window might already be destroyed
            }
        }
        this._windowSignals.clear();
        this._assignments.clear();
        this._originalStates.clear();
    }
}

class IndicatorManager {
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
}

class PreviewOverlay {
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
}

// ---------------------------------------------------------------------------
// SnapAssistant — mini-bar floating at the top of the screen during a drag.
// Shows one card per layout, each card containing proportional mini-tiles.
// ---------------------------------------------------------------------------
class SnapAssistant {
    constructor() {
        this._bar = null;
        this._cards = [];    // [{ layoutId, tileActors: [{ actor, tileIndex }], cardActor }]
        this._built = false;
        this._monitor = -1;
        this._barHeight = 0;
        this._active = null; // { layoutId, tileIndex } currently highlighted
    }

    // Pointer zone keeping the bar reachable. The bar is taller than the
    // 35 px minimum, so hovering its lower part must not fall back to the
    // classic snap zone.
    getActivationHeight() {
        return Math.max(35, this._barHeight + 4);
    }

    matchesMonitor(monitor) {
        return this._monitor === monitor;
    }

    // Build (or rebuild) the bar from the current LayoutEngine state.
    buildFor(layoutEngine, monitor, workArea) {
        this._destroyBar();
        this._monitor = monitor;

        this._bar = new St.BoxLayout({
            style_class: 'snap-assistant-bar',
            vertical: false,
            reactive: false,
        });

        const keys = layoutEngine.getKeys();

        keys.forEach(layoutId => {
            const tiles = layoutEngine.get(layoutId);

            const card = new St.Widget({
                style_class: 'snap-assistant-card',
                reactive: false,
            });

            const tileActors = [];

            tiles.forEach((tile, tileIndex) => {
                const tileActor = new St.Widget({
                    style_class: 'snap-assistant-tile',
                    reactive: false,
                });

                const CARD_W = 96;
                const CARD_H = 60;
                tileActor.set_position(
                    Math.round(tile.x * CARD_W),
                    Math.round(tile.y * CARD_H)
                );
                tileActor.set_size(
                    Math.max(1, Math.round(tile.width * CARD_W) - 2),
                    Math.max(1, Math.round(tile.height * CARD_H) - 2)
                );

                card.add_actor(tileActor);
                tileActors.push({ actor: tileActor, tileIndex });
            });

            card.set_size(96, 60);
            this._bar.add_actor(card);
            this._cards.push({ layoutId, tileActors, cardActor: card });
        });

        Main.uiGroup.add_actor(this._bar);

        // Centre the bar horizontally at the top of the work area
        const barWidth = keys.length * (96 + 8);
        const barX = Math.round(workArea.x + (workArea.width - barWidth) / 2);
        const barY = workArea.y + 2;
        this._bar.set_position(barX, barY);

        let barHeight = 0;
        try {
            [, barHeight] = this._bar.get_preferred_height(-1);
        } catch (e) {
            barHeight = 0;
        }
        this._barHeight = barHeight > 0 ? barHeight : 80;

        this._bar.hide();
        this._built = true;
    }

    // Given absolute pointer coords, return { layoutId, tileIndex } or null.
    findHoveredTile(px, py) {
        if (!this._bar || !this._built)
            return null;

        for (const { layoutId, tileActors, cardActor } of this._cards) {
            let cx, cy;
            if (cardActor.get_transformed_position) {
                [cx, cy] = cardActor.get_transformed_position();
            } else {
                [cx, cy] = [this._bar.x + cardActor.x, this._bar.y + cardActor.y];
            }
            const cw = cardActor.width;
            const ch = cardActor.height;

            if (px >= cx && px < cx + cw && py >= cy && py < cy + ch) {
                for (const { actor, tileIndex } of tileActors) {
                    let tx, ty;
                    if (actor.get_transformed_position) {
                        [tx, ty] = actor.get_transformed_position();
                    } else {
                        [tx, ty] = [cx + actor.x, cy + actor.y];
                    }
                    const tw = actor.width;
                    const th = actor.height;
                    if (px >= tx && px < tx + tw && py >= ty && py < ty + th) {
                        return { layoutId, tileIndex };
                    }
                }
                return { layoutId, tileIndex: 0 };
            }
        }
        return null;
    }

    highlightTile(layoutId, tileIndex) {
        if (this._active &&
            this._active.layoutId === layoutId &&
            this._active.tileIndex === tileIndex)
            return;

        this._setActive(layoutId, tileIndex);
    }

    clearHighlights() {
        this._setActive(null, -1);
    }

    // Toggles the highlight on at most two actors (previous and new) instead
    // of sweeping every tile of every layout on each drag tick. Every tile
    // keeps its base 'snap-assistant-tile' class permanently.
    _setActive(layoutId, tileIndex) {
        if (this._active) {
            this._applyActive(this._active.layoutId, this._active.tileIndex, false);
            this._active = null;
        }
        if (layoutId !== null && tileIndex >= 0) {
            this._applyActive(layoutId, tileIndex, true);
            this._active = { layoutId, tileIndex };
        }
    }

    _applyActive(layoutId, tileIndex, active) {
        for (const { layoutId: lid, tileActors } of this._cards) {
            if (lid !== layoutId)
                continue;

            for (const { actor, tileIndex: ti } of tileActors) {
                if (ti !== tileIndex)
                    continue;

                if (active)
                    actor.add_style_class_name('snap-assistant-tile-active');
                else
                    actor.remove_style_class_name('snap-assistant-tile-active');
                return;
            }
        }
    }

    isVisible() {
        return this._bar ? this._bar.visible : false;
    }

    show() {
        if (this._bar)
            this._bar.show();
    }

    hide() {
        if (this._bar && this._bar.visible) {
            this.clearHighlights();
            this._bar.hide();
        }
    }

    _destroyBar() {
        if (this._bar) {
            this._bar.destroy();
            this._bar = null;
        }
        this._cards = [];
        this._built = false;
        this._monitor = -1;
        this._barHeight = 0;
        this._active = null;
    }

    destroy() {
        this._destroyBar();
    }
}

class TilingExtension {
    constructor(metadata) {
        this.metadata = metadata;
        this.settings = null;
        this.layoutEngine = new LayoutEngine();
        this.tracker = new WindowTracker();
        this.indicator = new IndicatorManager(() => this._getPanel());
        this.previewOverlay = new PreviewOverlay();
        this.snapAssistant = new SnapAssistant();
        this._hotkeys = [];
        // Single source of truth for hotkeys: drives both the settings reload
        // bindings and the keybinding registrations.
        this._hotkeyBindings = [
            ['tile-left', () => this.tileFocusedWindow('left')],
            ['tile-right', () => this.tileFocusedWindow('right')],
            ['tile-up', () => this.tileFocusedWindow('up')],
            ['tile-down', () => this.tileFocusedWindow('down')],
            ['untile', () => this.untileFocusedWindow()],
            ['cycle-layout', () => this.cycleLayout()],
        ];
        this._grabSignals = [];
        this._draggedWindow = null;
        this._dragTimeoutId = 0;
        this._dragSignalWindow = null;
        this._dragWindowSignalId = 0;
        this._lastPointerX = null;
        this._lastPointerY = null;
        this._lastModifierActive = null;
        this._targetTile = null;
    }

    enable() {
        this.settings = new Settings.ExtensionSettings(this, UUID);
        Log.setDebug(this.settings.getValue('debug'));
        this.settings.bindProperty(Settings.BindingDirection.IN,
            'debug', 'debugEnabled', () => Log.setDebug(this.debugEnabled), null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
            'show-indicator', 'showIndicator', this._syncIndicator.bind(this), null);

        this._hotkeyBindings.forEach(([key]) => {
            this.settings.bindProperty(
                Settings.BindingDirection.IN,
                key,
                `_bound_${key.replace(/-/g, '_')}`,
                () => this._reloadHotkeys(),
                null
            );
        });

        this._installHotkeys();
        this._connectGrabSignals();
        this._syncIndicator();
        this._syncLayoutOptions();

        Log.debug(`enable() — ${this.layoutEngine.getKeys().length} dispositions, indicateur ${this.showIndicator ? 'affiche' : 'masque'}`);
    }

    disable() {
        Log.debug('disable()');
        this._removeHotkeys();
        this._disconnectGrabSignals();
        this._resetDrag();
        this.previewOverlay.destroy();
        this.snapAssistant.destroy();
        this.indicator.destroy();
        this.tracker.disconnectAll();
        if (this.settings) {
            if (this.settings.finalize)
                this.settings.finalize();
            this.settings = null;
        }
    }

    _installHotkeys() {
        this._removeHotkeys();

        this._hotkeyBindings.forEach(([key, action]) => {
            const value = this.settings.getValue(key);
            if (value) {
                const name = `${UUID}-${key}`;
                Main.keybindingManager.addHotKey(name, value, action);
                this._hotkeys.push(name);
            }
        });
    }

    _removeHotkeys() {
        this._hotkeys.forEach(name => Main.keybindingManager.removeHotKey(name));
        this._hotkeys = [];
    }

    _reloadHotkeys() {
        this._installHotkeys();
    }

    _syncIndicator() {
        this.indicator.sync(this.showIndicator, menu => this._rebuildMenu(menu));
    }

    // Keep the preferences combobox in sync with the loaded layouts: without
    // this, selecting a custom layout stores an id that Cinnamon's settings
    // sanity check resets to the default on the next schema upgrade.
    _syncLayoutOptions() {
        if (!this.settings || !this.settings.setOptions || !this.settings.getOptions)
            return;

        const options = {};
        this.layoutEngine.getKeys().forEach(id => {
            options[this.layoutEngine.getLabel(id)] = id;
        });

        const current = this.settings.getOptions('layout') || {};
        const newKeys = Object.keys(options);
        const same = Object.keys(current).length === newKeys.length &&
            newKeys.every(label => current[label] === options[label]);
        if (!same)
            this.settings.setOptions('layout', options);
    }

    _rebuildMenu(menu) {
        menu.removeAll();
        // Pick up layout files added or edited while Cinnamon was running.
        this.layoutEngine.loadCustomLayouts();
        this._syncLayoutOptions();
        const activeLayout = this.settings.getValue('layout');

        this.layoutEngine.getKeys().forEach(id => {
            const label = this.layoutEngine.getLabel(id);
            const item = new PopupMenu.PopupMenuItem(`${activeLayout === id ? '✓ ' : ''}${label}`);
            item.connect('activate', () => {
                this.settings.setValue('layout', id);
            });
            menu.addMenuItem(item);
        });

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const untile = new PopupMenu.PopupMenuItem('Restaurer la fenetre active');
        untile.connect('activate', () => this.untileFocusedWindow());
        menu.addMenuItem(untile);
    }

    cycleLayout() {
        const layoutKeys = this.layoutEngine.getKeys();
        const current = this.settings.getValue('layout');
        const currentIndex = layoutKeys.indexOf(current);
        const nextIndex = (currentIndex >= 0) ? (currentIndex + 1) % layoutKeys.length : 0;
        const nextLayoutId = layoutKeys[nextIndex];
        this.settings.setValue('layout', nextLayoutId);

        this._showOsd(this.layoutEngine.getLabel(nextLayoutId));
    }

    _showOsd(message) {
        if (Main.osdWindowManager && Main.osdWindowManager.show) {
            try {
                const icon = Gio.Icon.new_for_string('view-grid-symbolic');
                Main.osdWindowManager.show(-1, icon, message, null);
            } catch (e) {
                // Ignore OSD errors if not supported
            }
        }
    }

    tileFocusedWindow(direction) {
        const window = global.display.get_focus_window();
        if (!this._canTile(window))
            return;

        const layout = this.layoutEngine.get(this.settings.getValue('layout'));
        const currentMonitor = window.get_monitor();
        const assignment = this.tracker.getAssignment(window);
        const currentIndex = (assignment && assignment.monitor === currentMonitor)
            ? assignment.index
            : undefined;

        const tileIndex = this.layoutEngine.findTile(layout, currentIndex, direction);

        // Multi-monitor: seamlessly cross over if reaching the edge of the current monitor
        if (currentIndex !== undefined && tileIndex === currentIndex) {
            const adjacentMonitor = this._getAdjacentMonitor(currentMonitor, direction);
            if (adjacentMonitor !== -1) {
                const entryTile = (direction === 'right') ? this.layoutEngine.findTile(layout, undefined, 'left')
                                : (direction === 'left') ? this.layoutEngine.findTile(layout, undefined, 'right')
                                : (direction === 'down') ? this.layoutEngine.findTile(layout, undefined, 'up')
                                : this.layoutEngine.findTile(layout, undefined, 'down');
                this._tileWindow(window, layout[entryTile], entryTile, adjacentMonitor);
                return;
            }
        }

        this._tileWindow(window, layout[tileIndex], tileIndex, currentMonitor);
    }

    untileFocusedWindow() {
        const window = global.display.get_focus_window();
        if (!window || !this.tracker.hasOriginalState(window))
            return;

        const saved = this.tracker.getOriginalState(window);
        if (saved.wasMaximized) {
            window.maximize(Meta.MaximizeFlags.BOTH);
        } else if (saved.rect) {
            window.unmaximize(Meta.MaximizeFlags.BOTH);
            window.move_resize_frame(true, saved.rect.x, saved.rect.y, saved.rect.width, saved.rect.height);
        }

        this.tracker.cleanup(window);
    }

    _canTile(window) {
        if (!window || window.is_fullscreen())
            return false;
        if (window.get_window_type() !== Meta.WindowType.NORMAL)
            return false;
        if (window.allows_resize && !window.allows_resize())
            return false;
        if (window.get_transient_for && window.get_transient_for() !== null)
            return false;
        return true;
    }

    _getAdjacentMonitor(curMon, direction) {
        if (!global.display.get_n_monitors || global.display.get_n_monitors() <= 1)
            return -1;

        const nMonitors = global.display.get_n_monitors();
        const curGeom = global.display.get_monitor_geometry(curMon);
        const curCenterX = curGeom.x + curGeom.width / 2;
        const curCenterY = curGeom.y + curGeom.height / 2;

        let candidate = -1;
        let minDistance = Infinity;

        for (let i = 0; i < nMonitors; i++) {
            if (i === curMon)
                continue;

            const geom = global.display.get_monitor_geometry(i);
            const centerX = geom.x + geom.width / 2;
            const centerY = geom.y + geom.height / 2;

            let isCandidate = false;
            if (direction === 'right' && geom.x >= curGeom.x + curGeom.width - 10) isCandidate = true;
            else if (direction === 'left' && geom.x + geom.width <= curGeom.x + 10) isCandidate = true;
            else if (direction === 'down' && geom.y >= curGeom.y + curGeom.height - 10) isCandidate = true;
            else if (direction === 'up' && geom.y + geom.height <= curGeom.y + 10) isCandidate = true;

            if (!isCandidate) {
                if (direction === 'right' && centerX > curCenterX + curGeom.width / 4) isCandidate = true;
                else if (direction === 'left' && centerX < curCenterX - curGeom.width / 4) isCandidate = true;
                else if (direction === 'down' && centerY > curCenterY + curGeom.height / 4) isCandidate = true;
                else if (direction === 'up' && centerY < curCenterY - curGeom.height / 4) isCandidate = true;
            }

            if (isCandidate) {
                const d = (centerX - curCenterX) ** 2 + (centerY - curCenterY) ** 2;
                if (d < minDistance) {
                    minDistance = d;
                    candidate = i;
                }
            }
        }
        return candidate;
    }

    _tileWindow(window, tile, index, monitor) {
        const targetMonitor = (monitor !== undefined) ? monitor : window.get_monitor();

        this.tracker.register(window, index, targetMonitor);

        window.unmaximize(Meta.MaximizeFlags.BOTH);

        if (window.move_to_monitor && window.get_monitor() !== targetMonitor) {
            try {
                window.move_to_monitor(targetMonitor);
            } catch (e) {
                // Handled via coordinates in move_resize_frame
            }
        }

        const workArea = this._getWorkArea(targetMonitor);
        const outer = this.settings.getValue('outer-gap');
        const gap = this.settings.getValue('gap');

        const geom = this.layoutEngine.calculateGeometry(tile, workArea, outer, gap);
        window.move_resize_frame(true, geom.x, geom.y, geom.width, geom.height);
    }

    _connectGrabSignals() {
        if (!global.display || !global.display.connect)
            return;

        const beginId = global.display.connect('grab-op-begin', (display, arg1, arg2, arg3) => {
            this._onGrabOpBegin(display, arg1, arg2, arg3);
        });
        const endId = global.display.connect('grab-op-end', (display, arg1, arg2, arg3) => {
            this._onGrabOpEnd(display, arg1, arg2, arg3);
        });
        this._grabSignals.push(beginId, endId);
    }

    _disconnectGrabSignals() {
        if (!global.display || !global.display.disconnect)
            return;

        this._grabSignals.forEach(id => {
            try {
                global.display.disconnect(id);
            } catch (e) {
                // Ignore if display disconnected
            }
        });
        this._grabSignals = [];
    }

    _onGrabOpBegin(display, arg1, arg2, arg3) {
        const window = (arg3 !== undefined) ? arg2 : arg1;
        const op = (arg3 !== undefined) ? arg3 : arg2;

        if (!this._canTile(window))
            return;

        const isMoving = (op === Meta.GrabOp.MOVING || op === Meta.GrabOp.KEYBOARD_MOVING);
        if (!isMoving)
            return;

        // Snap preview disabled: do not arm the 25 ms poll for the whole drag.
        if (!this.settings || this.settings.getValue('enable-snap-preview') === false)
            return;

        this._draggedWindow = window;
        this._targetTile = null;
        this._trackDragWindow(window);

        if (this._dragTimeoutId) {
            GLib.source_remove(this._dragTimeoutId);
            this._dragTimeoutId = 0;
        }

        this._dragTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 25, () => {
            return this._onDragTick();
        });
    }

    _trackDragWindow(window) {
        this._untrackDragWindow();
        try {
            this._dragSignalWindow = window;
            this._dragWindowSignalId = window.connect('unmanaged', () => {
                this._resetDrag();
            });
        } catch (e) {
            this._dragSignalWindow = null;
            this._dragWindowSignalId = 0;
        }
    }

    _untrackDragWindow() {
        if (this._dragSignalWindow && this._dragWindowSignalId) {
            try {
                this._dragSignalWindow.disconnect(this._dragWindowSignalId);
            } catch (e) {
                // Window might already be destroyed
            }
        }
        this._dragSignalWindow = null;
        this._dragWindowSignalId = 0;
    }

    _resetDrag() {
        this._untrackDragWindow();

        if (this._dragTimeoutId) {
            GLib.source_remove(this._dragTimeoutId);
            this._dragTimeoutId = 0;
        }

        this.previewOverlay.hide();
        this.snapAssistant.hide();
        this._draggedWindow = null;
        this._lastPointerX = null;
        this._lastPointerY = null;
        this._lastModifierActive = null;
        this._targetTile = null;
    }

    _onDragTick() {
        if (!this._draggedWindow)
            return GLib.SOURCE_REMOVE;

        if (!this.settings || !this.settings.getValue('enable-snap-preview')) {
            this.previewOverlay.hide();
            this.snapAssistant.hide();
            this._targetTile = null;
            return GLib.SOURCE_CONTINUE;
        }

        if (!global.get_pointer)
            return GLib.SOURCE_CONTINUE;

        const [x, y, mods] = global.get_pointer();
        const mode = this.settings.getValue('snap-modifier') || 'ctrl';
        const modifierActive = this._isModifierActive(mods, mode);

        // Nothing changed since the previous tick: skip all the work below.
        if (this._lastPointerX === x && this._lastPointerY === y &&
            this._lastModifierActive === modifierActive)
            return GLib.SOURCE_CONTINUE;

        this._lastPointerX = x;
        this._lastPointerY = y;
        this._lastModifierActive = modifierActive;

        if (!modifierActive) {
            this.previewOverlay.hide();
            this.snapAssistant.hide();
            this._targetTile = null;
            return GLib.SOURCE_CONTINUE;
        }

        const monitor = this._getMonitorAt(x, y);
        const workArea = this._getWorkArea(monitor);

        const snapAssistantEnabled = this.settings.getValue('enable-snap-assistant') !== false;
        const snapZoneY = workArea.y + this.snapAssistant.getActivationHeight();

        // ── Snap Assistant zone ────────────────────────────────────────────
        if (snapAssistantEnabled && y < snapZoneY) {
            // Build the bar on first entry or when the pointer changed monitor
            if (!this.snapAssistant.isVisible() || !this.snapAssistant.matchesMonitor(monitor)) {
                this.snapAssistant.buildFor(this.layoutEngine, monitor, workArea);
                this.snapAssistant.show();
            }

            const hovered = this.snapAssistant.findHoveredTile(x, y);
            if (hovered) {
                this.snapAssistant.highlightTile(hovered.layoutId, hovered.tileIndex);

                const layout = this.layoutEngine.get(hovered.layoutId);
                const tile = layout[hovered.tileIndex];
                const outer = this.settings.getValue('outer-gap');
                const gap = this.settings.getValue('gap');
                const geom = this.layoutEngine.calculateGeometry(tile, workArea, outer, gap);

                this._targetTile = {
                    window: this._draggedWindow,
                    tile: tile,
                    index: hovered.tileIndex,
                    monitor: monitor,
                    layoutId: hovered.layoutId,
                };
                this.previewOverlay.show(geom);
            } else {
                this.snapAssistant.clearHighlights();
                this.previewOverlay.hide();
                this._targetTile = null;
            }
            return GLib.SOURCE_CONTINUE;
        }

        // ── Classic snap zone ────────────────────────────────────────────────
        this.snapAssistant.hide();

        const relX = (x - workArea.x) / workArea.width;
        const relY = (y - workArea.y) / workArea.height;

        const layout = this.layoutEngine.get(this.settings.getValue('layout'));
        const tileIndex = this.layoutEngine.findTileAt(layout, relX, relY);
        const tile = layout[tileIndex];

        const outer = this.settings.getValue('outer-gap');
        const gap = this.settings.getValue('gap');
        const geom = this.layoutEngine.calculateGeometry(tile, workArea, outer, gap);

        this._targetTile = {
            window: this._draggedWindow,
            tile: tile,
            index: tileIndex,
            monitor: monitor,
        };

        this.previewOverlay.show(geom);
        return GLib.SOURCE_CONTINUE;
    }

    _onGrabOpEnd(display, arg1, arg2, arg3) {
        const target = (this._targetTile && this._draggedWindow &&
                        this._targetTile.window === this._draggedWindow)
            ? this._targetTile
            : null;

        this._resetDrag();

        if (target) {
            // Apply tiling after Muffin completes internal grab cleanup
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                // A card can come from another layout: keep the active layout
                // consistent with the tile the window was dropped into.
                if (target.layoutId && this.settings &&
                    this.settings.getValue('sync-layout-on-snap') !== false &&
                    this.settings.getValue('layout') !== target.layoutId) {
                    this.settings.setValue('layout', target.layoutId);
                }
                this._tileWindow(target.window, target.tile, target.index, target.monitor);
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _isModifierActive(mods, mode) {
        if (mode === 'always')
            return true;
        if (mode === 'alt') {
            const altMask = Clutter.ModifierType ? Clutter.ModifierType.MOD1_MASK : 8;
            return (mods & altMask) !== 0;
        }
        const ctrlMask = Clutter.ModifierType ? Clutter.ModifierType.CONTROL_MASK : 4;
        return (mods & ctrlMask) !== 0;
    }

    _getMonitorAt(x, y) {
        const n = (global.display && global.display.get_n_monitors) ? global.display.get_n_monitors() : 1;
        for (let i = 0; i < n; i++) {
            const geom = global.display.get_monitor_geometry(i);
            if (x >= geom.x && x < geom.x + geom.width &&
                y >= geom.y && y < geom.y + geom.height) {
                return i;
            }
        }
        return (global.display && global.display.get_current_monitor) ? global.display.get_current_monitor() : 0;
    }

    _getWorkArea(monitor) {
        if (global.display && global.display.get_work_area_for_monitor)
            return global.display.get_work_area_for_monitor(monitor);
        if (global.screen && global.screen.get_monitor_workarea)
            return global.screen.get_monitor_workarea(monitor);
        return Main.layoutManager.getWorkAreaForMonitor(monitor);
    }

    // Called from settings-schema.json button callback.
    _openLayoutsFolder() {
        try {
            const uri = GLib.filename_to_uri(this.layoutEngine.customDir, null);
            Gio.AppInfo.launch_default_for_uri(uri, null);
        } catch (e) {
            Log.warn('Could not open layouts folder: ' + e);
        }
    }

    _getPanel() {
        if (Main.panel && Main.panel._rightBox)
            return Main.panel;
        if (Main.panelManager && Main.panelManager.panels && Main.panelManager.panels.length)
            return Main.panelManager.panels[0];
        return null;
    }
}

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
