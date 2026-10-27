/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Main = imports.ui.main;
const Settings = imports.ui.settings;
const PopupMenu = imports.ui.popupMenu;
const Meta = imports.gi.Meta;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Clutter = imports.gi.Clutter;
const Extension = imports.ui.extension;
const Me = Extension.getCurrentExtension();
const Log = Me.imports.lib.log.Log;
const LayoutEngine = Me.imports.lib.layoutEngine.LayoutEngine;
const LayoutState = Me.imports.lib.state.LayoutState;
const WindowTracker = Me.imports.lib.windowTracker.WindowTracker;
const IndicatorManager = Me.imports.lib.indicator.IndicatorManager;
const PreviewOverlay = Me.imports.lib.preview.PreviewOverlay;
const SnapAssistant = Me.imports.lib.snapAssistant.SnapAssistant;
const EdgeTiling = Me.imports.lib.edgeTiling.EdgeTiling;
const DragController = Me.imports.lib.dragController.DragController;

const UUID = 'cinnamon-tiling-shell@local';
const RESTORE_ORIGINAL_SIZE_DISTANCE = 90;

var TilingExtension = class TilingExtension {
    constructor(metadata) {
        this.metadata = metadata;
        this.settings = null;
        this.layoutEngine = new LayoutEngine();
        this.layoutState = new LayoutState();
        this.tracker = new WindowTracker();
        this.indicator = new IndicatorManager(() => this._getPanel());
        // Visual actors belong to an enabled instance only. Cinnamon can call
        // enable() again on the same module instance after disable().
        this.previewOverlay = null;
        this.snapAssistant = null;
        this._enabled = false;
        this._syncingPreference = false;
        this._lastSyncedPreference = null;
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
        this._muffinSignals = [];
        this._draggedWindow = null;
        this._dragTimeoutId = 0;
        this._dragSignalWindow = null;
        this._dragWindowSignalId = 0;
        this._lastPointerX = null;
        this._lastPointerY = null;
        this._lastModifierActive = null;
        this._targetTile = null;
        this._targetEdge = null;
        this._grabStartPointer = null;
        this._restoredOriginalSize = false;
        this._muffinTilePreviewActive = false;
    }

    enable() {
        // Recreate actors destroyed by disable() before connecting signals.
        // Keeping their construction out of init() also avoids actors from a
        // disabled extension being added to Main.uiGroup.
        if (!this.previewOverlay)
            this.previewOverlay = new PreviewOverlay();
        if (!this.snapAssistant)
            this.snapAssistant = new SnapAssistant();

        // Pick up layout files and selections written by a previous session or
        // while the extension was disabled.
        this.layoutEngine.loadCustomLayouts();
        this.layoutState.load();
        this._lastSyncedPreference = null;

        this.settings = new Settings.ExtensionSettings(this, UUID);
        Log.setDebug(this.settings.getValue('debug'));
        this.settings.bindProperty(Settings.BindingDirection.IN,
            'debug', 'debugEnabled', () => Log.setDebug(this.debugEnabled), null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
            'show-indicator', 'showIndicator', this._syncIndicator.bind(this), null);

        this.settings.bindProperty(Settings.BindingDirection.IN,
            'layout', 'layoutPreference', () => this._onLayoutPreferenceChanged(), null);

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

        this._enabled = true;
        Log.debug(`enable() — ${this.layoutEngine.getKeys().length} dispositions, indicateur ${this.showIndicator ? 'affiche' : 'masque'}`);
    }

    disable() {
        this._enabled = false;
        Log.debug('disable()');
        this._removeHotkeys();
        this._disconnectGrabSignals();
        this._resetDrag();
        if (this.previewOverlay) {
            this.previewOverlay.destroy();
            this.previewOverlay = null;
        }
        if (this.snapAssistant) {
            this.snapAssistant.destroy();
            this.snapAssistant = null;
        }
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

    _onLayoutPreferenceChanged() {
        if (!this._enabled || this._syncingPreference || !this.settings)
            return;

        const layoutId = this.settings.getValue('layout');
        if (!this.layoutEngine.layouts[layoutId])
            return;

        // Ignore the asynchronous settings-file notification for a value this
        // instance just wrote; the target monitor/workspace is already stored.
        if (layoutId === this._lastSyncedPreference) {
            this._lastSyncedPreference = null;
            return;
        }
        this._lastSyncedPreference = null;

        this._selectLayout(layoutId, this._getActiveMonitor(), this._getActiveWorkspaceIndex(), false);
    }

    _getActiveMonitor() {
        try {
            if (global.display && global.display.get_current_monitor)
                return global.display.get_current_monitor();
        } catch (e) {
            // Fall through to the first monitor.
        }
        return 0;
    }

    _getActiveWorkspaceIndex() {
        try {
            if (global.workspace_manager && global.workspace_manager.get_active_workspace_index)
                return global.workspace_manager.get_active_workspace_index();
            if (global.screen && global.screen.get_active_workspace_index)
                return global.screen.get_active_workspace_index();
        } catch (e) {
            // Fall through to the first workspace.
        }
        return 0;
    }

    _getWindowWorkspaceIndex(window) {
        try {
            if (window && window.get_workspace) {
                const workspace = window.get_workspace();
                if (workspace && workspace.index)
                    return workspace.index();
                if (workspace && global.screen && global.screen.get_workspace_index)
                    return global.screen.get_workspace_index(workspace);
            }
        } catch (e) {
            // Fall through to the active workspace.
        }
        return this._getActiveWorkspaceIndex();
    }

    _resolveLayoutId(monitor, workspace) {
        const fallback = (this.settings && this.settings.getValue('layout')) || 'two-columns';
        const stored = this.layoutState.getSelectedLayout(monitor, workspace);
        const candidate = stored || fallback;
        return this.layoutEngine.layouts[candidate] ? candidate : 'two-columns';
    }

    _getLayoutFor(monitor, workspace) {
        return this.layoutEngine.get(this._resolveLayoutId(monitor, workspace));
    }

    _getActiveSelection() {
        const monitor = this._getActiveMonitor();
        const workspace = this._getActiveWorkspaceIndex();
        return {
            monitor,
            workspace,
            layoutId: this._resolveLayoutId(monitor, workspace),
        };
    }

    _getFocusedSelection() {
        try {
            if (global.display && global.display.get_focus_window) {
                const window = global.display.get_focus_window();
                if (window) {
                    const monitor = window.get_monitor();
                    const workspace = this._getWindowWorkspaceIndex(window);
                    return {
                        monitor,
                        workspace,
                        layoutId: this._resolveLayoutId(monitor, workspace),
                    };
                }
            }
        } catch (e) {
            // Fall through to the pointer/active workspace selection.
        }
        return this._getActiveSelection();
    }

    _selectLayout(layoutId, monitor, workspace, syncPreference) {
        if (!this.layoutEngine.layouts[layoutId])
            return false;

        const targetMonitor = (Number.isInteger(monitor) && monitor >= 0)
            ? monitor : this._getActiveMonitor();
        const targetWorkspace = (Number.isInteger(workspace) && workspace >= 0)
            ? workspace : this._getActiveWorkspaceIndex();

        this.layoutState.setSelectedLayout(targetMonitor, targetWorkspace, layoutId);

        if (syncPreference !== false && this.settings &&
            this.settings.getValue('layout') !== layoutId) {
            this._lastSyncedPreference = layoutId;
            this._syncingPreference = true;
            try {
                this.settings.setValue('layout', layoutId);
            } finally {
                this._syncingPreference = false;
            }
        }

        Log.debug(`Disposition ${layoutId} sélectionnée (moniteur ${targetMonitor}, espace ${targetWorkspace})`);
        return true;
    }

    // Keep the preferences combobox in sync with the loaded layouts: without
    // this, selecting a custom layout stores an id that Cinnamon's settings
    // sanity check resets to the default on the next schema upgrade.
    _syncLayoutOptions() {
        if (!this.settings || !this.settings.setOptions || !this.settings.getOptions)
            return;

        const options = {};
        this.layoutEngine.getKeys().forEach(id => {
            const baseLabel = this.layoutEngine.getLabel(id);
            let label = baseLabel;
            let duplicate = 2;
            while (Object.prototype.hasOwnProperty.call(options, label))
                label = `${baseLabel} (${id} ${duplicate++})`;
            options[label] = id;
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
        const active = this._getActiveSelection();

        this.layoutEngine.getKeys().forEach(id => {
            const label = this.layoutEngine.getLabel(id);
            const item = new PopupMenu.PopupMenuItem(`${active.layoutId === id ? '✓ ' : ''}${label}`);
            item.connect('activate', () => {
                this._selectLayout(id);
            });
            menu.addMenuItem(item);
        });

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const untile = new PopupMenu.PopupMenuItem('Restaurer la fenetre active');
        untile.connect('activate', () => this.untileFocusedWindow());
        menu.addMenuItem(untile);

        menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        const exportItem = new PopupMenu.PopupMenuItem('Exporter la disposition active (JSON)');
        exportItem.connect('activate', () => this._exportActiveLayout());
        menu.addMenuItem(exportItem);

        const openFolder = new PopupMenu.PopupMenuItem('Ouvrir le dossier des dispositions');
        openFolder.connect('activate', () => this._openLayoutsFolder());
        menu.addMenuItem(openFolder);
    }

    cycleLayout() {
        const layoutKeys = this.layoutEngine.getKeys();
        const target = this._getFocusedSelection();
        const currentIndex = layoutKeys.indexOf(target.layoutId);
        const nextIndex = (currentIndex >= 0) ? (currentIndex + 1) % layoutKeys.length : 0;
        const nextLayoutId = layoutKeys[nextIndex];

        if (this._selectLayout(nextLayoutId, target.monitor, target.workspace))
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

        const currentMonitor = window.get_monitor();
        const workspace = this._getWindowWorkspaceIndex(window);
        const layout = this._getLayoutFor(currentMonitor, workspace);
        const assignment = this.tracker.getAssignment(window);
        const currentIndex = (assignment && assignment.monitor === currentMonitor)
            ? assignment.index
            : undefined;

        const tileIndex = this.layoutEngine.findTile(layout, currentIndex, direction);

        // Multi-monitor: seamlessly cross over if reaching the edge of the current monitor
        if (currentIndex !== undefined && tileIndex === currentIndex) {
            const adjacentMonitor = this._getAdjacentMonitor(currentMonitor, direction);
            if (adjacentMonitor !== -1) {
                const adjacentLayout = this._getLayoutFor(adjacentMonitor, workspace);
                const entryTile = (direction === 'right') ? this.layoutEngine.findTile(adjacentLayout, undefined, 'left')
                                : (direction === 'left') ? this.layoutEngine.findTile(adjacentLayout, undefined, 'right')
                                : (direction === 'down') ? this.layoutEngine.findTile(adjacentLayout, undefined, 'up')
                                : this.layoutEngine.findTile(adjacentLayout, undefined, 'down');
                this._tileWindow(window, adjacentLayout[entryTile], entryTile, adjacentMonitor);
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

        // Muffin may show its own tile preview at the screen edges. Track it
        // so edge tiling does not draw a second preview on top of it.
        if (!global.window_manager || !global.window_manager.connect)
            return;

        try {
            const showId = global.window_manager.connect('show-tile-preview', (wm, window) => {
                if (window !== this._draggedWindow)
                    return;
                this._muffinTilePreviewActive = true;
                // Native snapping wins: cancel every extension target so a
                // native preview is not followed by our own tiling on drop.
                this._targetTile = null;
                this._targetEdge = null;
                if (this.previewOverlay)
                    this.previewOverlay.hide();
                if (this.snapAssistant)
                    this.snapAssistant.hide();
            });
            this._muffinSignals.push(showId);

            const hideId = global.window_manager.connect('hide-tile-preview', () => {
                this._muffinTilePreviewActive = false;
            });
            this._muffinSignals.push(hideId);
        } catch (e) {
            Log.debug(`Signaux d'aperçu Muffin indisponibles : ${e}`);
        }
    }

    _disconnectGrabSignals() {
        if (global.display && global.display.disconnect) {
            this._grabSignals.forEach(id => {
                try {
                    global.display.disconnect(id);
                } catch (e) {
                    // Ignore if display disconnected
                }
            });
        }
        this._grabSignals = [];

        if (global.window_manager && global.window_manager.disconnect) {
            this._muffinSignals.forEach(id => {
                try {
                    global.window_manager.disconnect(id);
                } catch (e) {
                    // Ignore if the window manager disconnected
                }
            });
        }
        this._muffinSignals = [];
    }

    _onGrabOpBegin(display, arg1, arg2, arg3) {
        const window = (arg3 !== undefined) ? arg2 : arg1;
        const op = (arg3 !== undefined) ? arg3 : arg2;

        if (!this._canTile(window))
            return;

        const isMoving = (op === Meta.GrabOp.MOVING || op === Meta.GrabOp.KEYBOARD_MOVING);
        if (!isMoving)
            return;

        // The poll is needed for the preview and/or for restoring the size of
        // a tiled window as soon as the drag starts.
        if (!this.settings)
            return;

        const previewEnabled = this.settings.getValue('enable-snap-preview') !== false;
        const restoreEnabled = this.settings.getValue('restore-original-size') !== false;
        const needsRestore = restoreEnabled && this.tracker.hasOriginalState(window);
        if (!previewEnabled && !needsRestore)
            return;

        this._draggedWindow = window;
        this._targetTile = null;
        this._targetEdge = null;
        this._grabStartPointer = null;
        this._restoredOriginalSize = false;
        this._muffinTilePreviewActive = false;
        if (global.get_pointer) {
            const [x, y] = global.get_pointer();
            this._grabStartPointer = { x: x, y: y };
        }
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

        if (this.previewOverlay)
            this.previewOverlay.hide();
        if (this.snapAssistant)
            this.snapAssistant.hide();
        this._draggedWindow = null;
        this._lastPointerX = null;
        this._lastPointerY = null;
        this._lastModifierActive = null;
        this._targetTile = null;
        this._targetEdge = null;
        this._grabStartPointer = null;
        this._restoredOriginalSize = false;
        this._muffinTilePreviewActive = false;
    }

    _maybeRestoreOriginalSize(x, y) {
        if (this._restoredOriginalSize || !this._draggedWindow || !this.settings)
            return;
        if (this.settings.getValue('restore-original-size') === false)
            return;

        if (!this._grabStartPointer) {
            this._grabStartPointer = { x: x, y: y };
            return;
        }

        const dx = x - this._grabStartPointer.x;
        const dy = y - this._grabStartPointer.y;
        if ((dx * dx + dy * dy) <=
            RESTORE_ORIGINAL_SIZE_DISTANCE * RESTORE_ORIGINAL_SIZE_DISTANCE)
            return;

        const saved = this.tracker.getOriginalState(this._draggedWindow);
        if (!saved || saved.wasMaximized || !saved.rect)
            return;

        const window = this._draggedWindow;
        if (!window.get_frame_rect || !window.move_resize_frame)
            return;

        try {
            if (window.get_maximized && window.get_maximized() !== 0)
                return;

            const currentRect = window.get_frame_rect();
            const restored = DragController.computeRestoredRect(
                saved.rect, currentRect, { x: x, y: y });
            if (!restored)
                return;

            window.move_resize_frame(true, restored.x, restored.y,
                restored.width, restored.height);
            // The window has left its tile: forget the assignment, but do not
            // recreate the saved state with the restored geometry.
            this.tracker.cleanup(window);
            this._restoredOriginalSize = true;
            Log.debug(`Taille d'origine restaurée : ${restored.width}x${restored.height} à ${restored.x},${restored.y}`);
        } catch (e) {
            Log.warn(`Restauration de la taille impossible : ${e}`);
        }
    }

    _onDragTick() {
        if (!this._draggedWindow)
            return GLib.SOURCE_REMOVE;

        if (!this.settings) {
            if (this.previewOverlay)
                this.previewOverlay.hide();
            if (this.snapAssistant)
                this.snapAssistant.hide();
            this._targetTile = null;
            this._targetEdge = null;
            return GLib.SOURCE_CONTINUE;
        }

        if (!global.get_pointer)
            return GLib.SOURCE_CONTINUE;

        const [x, y, mods] = global.get_pointer();
        this._maybeRestoreOriginalSize(x, y);

        if (this.settings.getValue('enable-snap-preview') === false) {
            this.previewOverlay.hide();
            this.snapAssistant.hide();
            this._targetTile = null;
            this._targetEdge = null;
            return GLib.SOURCE_CONTINUE;
        }

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
            this._targetEdge = null;
            return GLib.SOURCE_CONTINUE;
        }

        // Muffin's native tile preview is active for this drag: yield to it.
        if (this._muffinTilePreviewActive) {
            this.previewOverlay.hide();
            this.snapAssistant.hide();
            this._targetTile = null;
            this._targetEdge = null;
            return GLib.SOURCE_CONTINUE;
        }

        const monitor = this._getMonitorAt(x, y);
        const workspace = this._getWindowWorkspaceIndex(this._draggedWindow);
        const workArea = this._getWorkArea(monitor);
        const layout = this._getLayoutFor(monitor, workspace);

        // ── Edge tiling zone (16 px, 8 px at the top) ─────────────────────
        const edgeMode = this.settings.getValue('edge-tiling-mode') || 'off';
        if (edgeMode !== 'off' && !this._muffinTilePreviewActive) {
            const edge = EdgeTiling.compute({ x: x, y: y }, workArea, layout, edgeMode);
            if (edge) {
                this.snapAssistant.hide();
                this.previewOverlay.show(edge.rect);
                this._targetEdge = {
                    window: this._draggedWindow,
                    rect: edge.rect,
                    maximize: edge.maximize,
                    zone: edge.zone,
                    monitor: monitor,
                    workspace: workspace,
                };
                this._targetTile = null;
                return GLib.SOURCE_CONTINUE;
            }
        }
        this._targetEdge = null;

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

                const hoveredLayout = this.layoutEngine.get(hovered.layoutId);
                const tile = hoveredLayout[hovered.tileIndex];
                const outer = this.settings.getValue('outer-gap');
                const gap = this.settings.getValue('gap');
                const geom = this.layoutEngine.calculateGeometry(tile, workArea, outer, gap);

                this._targetTile = {
                    window: this._draggedWindow,
                    tile: tile,
                    index: hovered.tileIndex,
                    monitor: monitor,
                    workspace: workspace,
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
            workspace: workspace,
        };

        this.previewOverlay.show(geom);
        return GLib.SOURCE_CONTINUE;
    }

    _applyEdgeTarget(target) {
        const window = target.window;
        if (!window)
            return;

        try {
            if (target.maximize) {
                // Keep the pre-maximize geometry so the untile shortcut can
                // bring the window back after an edge maximize.
                this.tracker.register(window, -1, target.monitor);
                if (!window.can_maximize || window.can_maximize())
                    window.maximize(Meta.MaximizeFlags.BOTH);
                return;
            }

            this.tracker.register(window, -1, target.monitor);
            if (window.unmaximize)
                window.unmaximize(Meta.MaximizeFlags.BOTH);
            if (window.move_to_monitor && window.get_monitor &&
                window.get_monitor() !== target.monitor)
                window.move_to_monitor(target.monitor);
            window.move_resize_frame(true, target.rect.x, target.rect.y,
                target.rect.width, target.rect.height);
        } catch (e) {
            Log.warn(`Application du tuilage au bord impossible : ${e}`);
        }
    }

    _onGrabOpEnd(display, arg1, arg2, arg3) {
        const edgeTarget = (this._targetEdge && this._draggedWindow &&
                            this._targetEdge.window === this._draggedWindow)
            ? this._targetEdge
            : null;
        const target = (this._targetTile && this._draggedWindow &&
                        this._targetTile.window === this._draggedWindow)
            ? this._targetTile
            : null;

        this._resetDrag();

        if (edgeTarget) {
            // Apply the edge rectangle after Muffin completes grab cleanup.
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (!this.settings)
                    return GLib.SOURCE_REMOVE;
                this._applyEdgeTarget(edgeTarget);
                return GLib.SOURCE_REMOVE;
            });
            return;
        }

        if (target) {
            // Apply tiling after Muffin completes internal grab cleanup
            GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (!this.settings)
                    return GLib.SOURCE_REMOVE;

                // A card can come from another layout: keep the selection of
                // this monitor/workspace consistent with the dropped tile.
                if (target.layoutId && target.workspace !== undefined &&
                    this.settings.getValue('sync-layout-on-snap') !== false) {
                    this._selectLayout(target.layoutId, target.monitor, target.workspace);
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
            Log.warn(`Impossible d'ouvrir le dossier des dispositions : ${e}`);
        }
    }

    // Exports go to a subfolder so they are not loaded as custom layouts and
    // cannot silently overwrite a hand-edited file.
    _exportActiveLayout() {
        if (!this.settings)
            return;

        const active = this._getActiveSelection();
        const label = this.layoutEngine.getLabel(active.layoutId);
        const exportDir = GLib.build_filenamev([this.layoutEngine.customDir, 'exports']);

        try {
            const dirFile = Gio.File.new_for_path(exportDir);
            if (!dirFile.query_exists(null))
                dirFile.make_directory_with_parents(null);
        } catch (e) {
            Log.warn(`Impossible de créer le dossier d'export : ${e}`);
            this._showOsd("Échec de l'export de la disposition");
            return;
        }

        const base = this._slugify(label || active.layoutId);
        let target = GLib.build_filenamev([exportDir, `${base}.json`]);
        let suffix = 2;
        while (Gio.File.new_for_path(target).query_exists(null) && suffix < 100) {
            target = GLib.build_filenamev([exportDir, `${base}-${suffix}.json`]);
            suffix++;
        }

        if (this.layoutEngine.exportLayout(active.layoutId, target)) {
            this._showOsd(`Disposition exportée : ${target.split('/').pop()}`);
            Log.debug(`Export de ${active.layoutId} vers ${target}`);
        } else {
            this._showOsd("Échec de l'export de la disposition");
        }
    }

    _slugify(value) {
        let text = String(value);
        if (text.normalize)
            text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const slug = text.toLowerCase()
            .replace(/[^a-z0-9._-]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || 'disposition';
    }

    _getPanel() {
        if (Main.panel && Main.panel._rightBox)
            return Main.panel;
        if (Main.panelManager && Main.panelManager.panels && Main.panelManager.panels.length)
            return Main.panelManager.panels[0];
        return null;
    }
};
