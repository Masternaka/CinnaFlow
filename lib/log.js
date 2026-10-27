/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const LOG_PREFIX = '[CinnaFlow] ';

// Centralized logger: every message is prefixed so it can be grepped in
// ~/.xsession-errors. Debug traces are gated by the `debug` preference.
var Log = {
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
