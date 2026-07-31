import { Main } from './utils/main';
import { GObject, Meta, Gio } from './gi/ext';
import Settings from './settings/settings';
import SignalHandling from './utils/signalHandling';
import { registerGObjectClass } from './utils/gjs';
import { logger } from './utils/logger';

const debug = logger('KeyBindings');

export enum KeyBindingsDirection {
    NODIRECTION = 1,
    UP,
    DOWN,
    LEFT,
    RIGHT,
}

export enum FocusSwitchDirection {
    NEXT = 1,
    PREV,
}

export default class KeyBindings extends GObject.Object {
    static { registerGObjectClass(this, {
        GTypeName: 'KeyBindings',
        Signals: {
            'move-window': {
                param_types: [Meta.Display.$gtype, GObject.TYPE_INT],
            },
            'span-window': {
                param_types: [Meta.Display.$gtype, GObject.TYPE_INT],
            },
            'span-window-all-tiles': {
                param_types: [Meta.Display.$gtype],
            },
            'untile-window': {
                param_types: [Meta.Display.$gtype],
            },
            'move-window-center': {
                param_types: [Meta.Display.$gtype],
            },
            'focus-window-direction': {
                param_types: [Meta.Display.$gtype, GObject.TYPE_INT],
            },
            'focus-window': {
                param_types: [Meta.Display.$gtype, GObject.TYPE_INT],
            },
            'highlight-current-window': {
                param_types: [Meta.Display.$gtype],
            },
            'cycle-layouts': {
                param_types: [
                    Meta.Display.$gtype,
                    GObject.TYPE_INT,
                    GObject.TYPE_INT
                ],
            },
        },
    })};

    private _signals: SignalHandling;
    private _registeredHotkeys: string[] = [];

    constructor(_extensionSettings?: any) {
        super();
        this._signals = new SignalHandling();

        this._signals.connect(
            Settings,
            Settings.KEY_ENABLE_MOVE_KEYBINDINGS,
            () => {
                this._setupKeyBindings();
            },
        );
        if (Settings.ENABLE_MOVE_KEYBINDINGS)
            this._setupKeyBindings();
    }

    private _setupKeyBindings() {
        if (Settings.ENABLE_MOVE_KEYBINDINGS)
            this._applyKeybindings();
        else
            this._removeKeybindings();
    }

    private _addHotKey(name: string, callback: () => void) {
        const val = Settings.cinnamonSettings?.getValue(name);
        if (!val) return;
        try {
            Main.keybindingManager.addHotKey(name, val, callback);
            this._registeredHotkeys.push(name);
        } catch (e) {
            debug(`Failed to register hotkey ${name}:`, e);
        }
    }

    private _applyKeybindings() {
        this._removeKeybindings();

        const getDisplay = () => (globalThis as any).global?.display;

        this._addHotKey(Settings.SETTING_MOVE_WINDOW_RIGHT, () => {
            this.emit('move-window', getDisplay(), KeyBindingsDirection.RIGHT);
        });

        this._addHotKey(Settings.SETTING_MOVE_WINDOW_LEFT, () => {
            this.emit('move-window', getDisplay(), KeyBindingsDirection.LEFT);
        });

        this._addHotKey(Settings.SETTING_MOVE_WINDOW_UP, () => {
            this.emit('move-window', getDisplay(), KeyBindingsDirection.UP);
        });

        this._addHotKey(Settings.SETTING_MOVE_WINDOW_DOWN, () => {
            this.emit('move-window', getDisplay(), KeyBindingsDirection.DOWN);
        });

        this._addHotKey(Settings.SETTING_SPAN_WINDOW_RIGHT, () => {
            this.emit('span-window', getDisplay(), KeyBindingsDirection.RIGHT);
        });

        this._addHotKey(Settings.SETTING_SPAN_WINDOW_LEFT, () => {
            this.emit('span-window', getDisplay(), KeyBindingsDirection.LEFT);
        });

        this._addHotKey(Settings.SETTING_SPAN_WINDOW_UP, () => {
            this.emit('span-window', getDisplay(), KeyBindingsDirection.UP);
        });

        this._addHotKey(Settings.SETTING_SPAN_WINDOW_DOWN, () => {
            this.emit('span-window', getDisplay(), KeyBindingsDirection.DOWN);
        });

        this._addHotKey(Settings.SETTING_SPAN_WINDOW_ALL_TILES, () => {
            this.emit('span-window-all-tiles', getDisplay());
        });

        this._addHotKey(Settings.SETTING_UNTILE_WINDOW, () => {
            this.emit('untile-window', getDisplay());
        });

        this._addHotKey(Settings.SETTING_MOVE_WINDOW_CENTER, () => {
            this.emit('move-window-center', getDisplay());
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_RIGHT, () => {
            this.emit('focus-window-direction', getDisplay(), KeyBindingsDirection.RIGHT);
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_LEFT, () => {
            this.emit('focus-window-direction', getDisplay(), KeyBindingsDirection.LEFT);
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_UP, () => {
            this.emit('focus-window-direction', getDisplay(), KeyBindingsDirection.UP);
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_DOWN, () => {
            this.emit('focus-window-direction', getDisplay(), KeyBindingsDirection.DOWN);
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_NEXT, () => {
            this.emit('focus-window', getDisplay(), FocusSwitchDirection.NEXT);
        });

        this._addHotKey(Settings.SETTING_FOCUS_WINDOW_PREV, () => {
            this.emit('focus-window', getDisplay(), FocusSwitchDirection.PREV);
        });

        this._addHotKey(Settings.SETTING_HIGHLIGHT_CURRENT_WINDOW, () => {
            this.emit('highlight-current-window', getDisplay());
        });

        this._addHotKey(Settings.SETTING_CYCLE_LAYOUTS, () => {
            this.emit('cycle-layouts', getDisplay(), 0, 0);
        });

        this._addHotKey(Settings.SETTING_CYCLE_LAYOUTS_BACKWARD, () => {
            this.emit('cycle-layouts', getDisplay(), 1, 0);
        });
    }

    private _removeKeybindings() {
        for (const key of this._registeredHotkeys) {
            try {
                Main.keybindingManager.removeHotKey(key);
            } catch (_) { /* ignore */ }
        }
        this._registeredHotkeys = [];
    }

    public destroy() {
        this._removeKeybindings();
        this._signals.disconnect();
    }
}
