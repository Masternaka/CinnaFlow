import { Extension } from './polyfill';
import { Gio, GLib, Meta } from './gi/ext';
import { logger } from './utils/logger';
import {
    filterUnfocusableWindows,
    getMonitors,
    getWindows,
    squaredEuclideanDistance,
} from './utils/ui';
import { Main } from './utils/main';
import { TilingManager } from './components/tilingsystem/tilingManager';
import Settings from './settings/settings';
import SignalHandling from './utils/signalHandling';
import GlobalState from './utils/globalState';
import Indicator from './indicator/indicator';
import DBus from './dbus';
import { KeyBindingsDirection, FocusSwitchDirection } from './keybindings';
import KeyBindings from './keybindings';
import SettingsOverride from './settings/settingsOverride';
import { ResizingManager } from './components/tilingsystem/resizeManager';
import Tile from './components/layout/Tile';
import { WindowBorderManager } from './components/windowBorder/windowBorderManager';
import TilingShellWindowManager from './components/windowManager/tilingShellWindowManager';
import ExtendedWindow from './components/tilingsystem/extendedWindow';
import OverriddenAltTab from './components/altTab/overriddenAltTab';
import { LayoutSwitcherPopup } from './components/layoutSwitcher/layoutSwitcher';
import { unmaximizeWindow } from './utils/gnomesupport';
import { RaiseTogetherManager } from './components/raiseTogether/raiseTogetherManager';

const debug = logger('extension');

declare const imports: any;

class TilingShellExtension extends Extension {
    private _indicator: Indicator | null;
    private _tilingManagers: TilingManager[];
    private _fractionalScalingEnabled: boolean;
    private _dbus: DBus | null;
    private _signals: SignalHandling | null;
    private _keybindings: KeyBindings | null;
    private _resizingManager: ResizingManager | null;
    private _windowBorderManager: WindowBorderManager | null;
    private _raiseTogetherManager: RaiseTogetherManager | null;

    constructor(metadata: any) {
        super(metadata);
        this._signals = null;
        this._fractionalScalingEnabled = false;
        this._tilingManagers = [];
        this._indicator = null;
        this._dbus = null;
        this._keybindings = null;
        this._resizingManager = null;
        this._windowBorderManager = null;
        this._raiseTogetherManager = null;
    }

    createIndicator() {
        this._indicator = new Indicator(this.path, this.uuid);
        this._indicator.enableScaling = !this._fractionalScalingEnabled;
        this._indicator.enable();
    }

    enable(): void {
        if (this._signals) this._signals.disconnect();
        this._signals = new SignalHandling();

        const extensionSettings = new imports.ui.settings.ExtensionSettings(
            this,
            this.uuid,
        );
        Settings.initialize(extensionSettings);

        // Force initialization and tracking of windows
        TilingShellWindowManager.get();

        if (this._keybindings) this._keybindings.destroy();
        this._keybindings = new KeyBindings(extensionSettings);

        this._createTilingManagers();
        this._setupSignals();

        this._resizingManager = new ResizingManager();
        this._resizingManager.enable();

        if (this._windowBorderManager) this._windowBorderManager.destroy();
        this._windowBorderManager = new WindowBorderManager(
            !this._fractionalScalingEnabled,
        );
        this._windowBorderManager.enable();

        this._raiseTogetherManager = new RaiseTogetherManager();
        this._raiseTogetherManager.enable();

        this.createIndicator();

        if (this._dbus) this._dbus.disable();
        this._dbus = new DBus();
        this._dbus.enable(this);

        if (Settings.OVERRIDE_ALT_TAB) OverriddenAltTab.enable();

        debug('Cinnamon extension is enabled');
    }

    public openLayoutEditor() {
        this._indicator?.openLayoutEditor();
    }

    private _createTilingManagers() {
        debug('building a tiling manager for each monitor');
        this._tilingManagers.forEach((tm) => tm.destroy());
        this._tilingManagers = getMonitors().map(
            (monitor: any) =>
                new TilingManager(monitor, !this._fractionalScalingEnabled),
        );
        this._tilingManagers.forEach((tm) => tm.enable());
    }

    private _setupSignals() {
        if (!this._signals) return;

        this._signals.connect(global.display, 'workareas-changed', () => {
            const allMonitors = getMonitors();
            if (this._tilingManagers.length !== allMonitors.length) {
                GlobalState.get().validate_selected_layouts();
                this._createTilingManagers();
            } else {
                this._tilingManagers.forEach((tm, index) => {
                    tm.workArea =
                        Main.layoutManager.getWorkAreaForMonitor(index);
                });
            }
        });

        if (this._keybindings) {
            this._signals.connect(
                this._keybindings,
                'move-window',
                (
                    kb: KeyBindings,
                    dp: any,
                    dir: KeyBindingsDirection,
                ) => {
                    this._onKeyboardMoveWin(dp, dir, false);
                },
            );
            this._signals.connect(
                this._keybindings,
                'span-window',
                (
                    kb: KeyBindings,
                    dp: any,
                    dir: KeyBindingsDirection,
                ) => {
                    this._onKeyboardMoveWin(dp, dir, true);
                },
            );
            this._signals.connect(
                this._keybindings,
                'span-window-all-tiles',
                (kb: KeyBindings, dp: any) => {
                    const window = dp.focus_window;
                    if (!window) return;
                    const monitorIndex = window.get_monitor();
                    const manager = this._tilingManagers[monitorIndex];
                    if (manager) manager.onSpanAllTiles(window);
                },
            );
            this._signals.connect(
                this._keybindings,
                'untile-window',
                this._onKeyboardUntileWindow.bind(this),
            );
            this._signals.connect(
                this._keybindings,
                'move-window-center',
                (kb: KeyBindings, dp: any) => {
                    this._onKeyboardMoveWin(
                        dp,
                        KeyBindingsDirection.NODIRECTION,
                        false,
                    );
                },
            );
            this._signals.connect(
                this._keybindings,
                'focus-window-direction',
                this._onKeyboardFocusWinDirection.bind(this),
            );
            this._signals.connect(
                this._keybindings,
                'focus-window',
                this._onKeyboardFocusWin.bind(this),
            );
            this._signals.connect(
                this._keybindings,
                'highlight-current-window',
                (kb: KeyBindings, dp: any) => {
                    const window = dp.focus_window;
                    if (window)
                        TilingShellWindowManager.get().highlightWindow(window);
                },
            );
            this._signals.connect(
                this._keybindings,
                'cycle-layouts',
                (kb: KeyBindings, dp: any, action: number) => {
                    const currentMonitor =
                        Main.layoutManager.currentMonitor ||
                        Main.layoutManager.monitors[
                            Main.layoutManager.primaryIndex
                        ];
                    new LayoutSwitcherPopup(
                        currentMonitor.index,
                        action === 1,
                    ).show();
                },
            );
        }
    }

    private _onKeyboardUntileWindow(_kb: KeyBindings, dp: any) {
        const window = dp.focus_window;
        if (!window) return;

        const monitorIndex = window.get_monitor();
        const manager = this._tilingManagers[monitorIndex];
        if (manager) manager.untileWindow(window);
    }

    private _onKeyboardFocusWinDirection(
        _kb: KeyBindings,
        dp: any,
        dir: KeyBindingsDirection,
    ) {
        const focusedWindow = dp.focus_window;
        if (!focusedWindow) return;

        const currentMonitorIndex = focusedWindow.get_monitor();
        const activeWorkspace = (global.workspace_manager ?? global.workspaceManager).get_active_workspace();

        let candidates = filterUnfocusableWindows(getWindows(activeWorkspace));
        if (Settings.ENABLE_DIRECTIONAL_FOCUS_TILED_ONLY) {
            candidates = candidates.filter(
                (w) => (w as ExtendedWindow).assignedTile,
            );
        }

        const currentRect = focusedWindow.get_frame_rect();

        let filteredCandidates = candidates.filter((w) => w !== focusedWindow);

        if (!Settings.WRAPAROUND_FOCUS) {
            filteredCandidates = filteredCandidates.filter((w) => {
                const rect = w.get_frame_rect();
                switch (dir) {
                    case KeyBindingsDirection.RIGHT:
                        return rect.x >= currentRect.x + currentRect.width;
                    case KeyBindingsDirection.LEFT:
                        return rect.x + rect.width <= currentRect.x;
                    case KeyBindingsDirection.UP:
                        return rect.y + rect.height <= currentRect.y;
                    case KeyBindingsDirection.DOWN:
                        return rect.y >= currentRect.y + currentRect.height;
                    default:
                        return true;
                }
            });
        }

        if (filteredCandidates.length === 0) return;

        let bestCandidate: any = null;
        let minDistance = Infinity;

        filteredCandidates.forEach((w) => {
            const dist = squaredEuclideanDistance(currentRect, w.get_frame_rect());
            if (dist < minDistance) {
                minDistance = dist;
                bestCandidate = w;
            }
        });

        if (bestCandidate) bestCandidate.activate(global.get_current_time());
    }

    private _onKeyboardFocusWin(
        _kb: KeyBindings,
        dp: any,
        dir: FocusSwitchDirection,
    ) {
        const focusedWindow = dp.focus_window;
        const activeWorkspace = (global.workspace_manager ?? global.workspaceManager).get_active_workspace();
        const tiledWindows = filterUnfocusableWindows(
            getWindows(activeWorkspace),
        ).filter((w) => (w as ExtendedWindow).assignedTile);

        if (tiledWindows.length === 0) return;

        let nextIndex = 0;
        if (focusedWindow) {
            const currentIndex = tiledWindows.indexOf(focusedWindow);
            if (currentIndex !== -1) {
                if (dir === FocusSwitchDirection.NEXT) {
                    nextIndex = (currentIndex + 1) % tiledWindows.length;
                } else {
                    nextIndex =
                        (currentIndex - 1 + tiledWindows.length) %
                        tiledWindows.length;
                }
            }
        }

        tiledWindows[nextIndex].activate(global.get_current_time());
    }

    private _onKeyboardMoveWin(
        dp: any,
        dir: KeyBindingsDirection,
        spanMultipleTiles: boolean = false,
    ) {
        const window = dp.focus_window;
        if (!window) return;

        const monitorIndex = window.get_monitor();
        const manager = this._tilingManagers[monitorIndex];
        if (!manager) return;

        unmaximizeWindow(window);

        if (dir === KeyBindingsDirection.NODIRECTION) {
            manager.onMoveCenterTile(window);
            return;
        }

        if (spanMultipleTiles) {
            manager.onKeyboardSpanWin(window, dir);
        } else {
            manager.onKeyboardMoveWin(window, dir);
        }
    }

    disable(): void {
        this._tilingManagers.forEach((tm) => tm.destroy());
        this._tilingManagers = [];
        this._signals?.disconnect();
        this._signals = null;
        this._keybindings?.destroy();
        this._keybindings = null;
        this._resizingManager?.disable();
        this._resizingManager = null;
        this._windowBorderManager?.destroy();
        this._windowBorderManager = null;
        this._raiseTogetherManager?.disable();
        this._raiseTogetherManager = null;
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
        if (this._dbus) {
            this._dbus.disable();
            this._dbus = null;
        }
        GlobalState.destroy();
        SettingsOverride.get().restore();
        SettingsOverride.destroy();
        Settings.destroy();

        OverriddenAltTab.disable();
        debug('Cinnamon extension is disabled');
    }
}

let _extension: TilingShellExtension | null = null;

export function init(meta: any) {
    _extension = new TilingShellExtension(meta);
}

export function enable() {
    _extension?.enable();
}

export function disable() {
    _extension?.disable();
}
