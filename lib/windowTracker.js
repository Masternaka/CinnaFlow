/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Meta = imports.gi.Meta;

var WindowTracker = class WindowTracker {
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
};
