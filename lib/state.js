/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Extension = imports.ui.extension;
const Me = Extension.getCurrentExtension();
const Log = Me.imports.lib.log.Log;

var LayoutState = class LayoutState {
    constructor() {
        this.path = GLib.build_filenamev([
            GLib.get_user_config_dir(),
            'cinnaflow',
            'state.json',
        ]);
        this._selections = {};
        this.load();
    }

    load() {
        this._selections = {};

        try {
            const file = Gio.File.new_for_path(this.path);
            if (!file.query_exists(null))
                return;

            const [ok, contents] = file.load_contents(null);
            if (!ok) {
                Log.warn('État des dispositions illisible : lecture impossible');
                return;
            }

            const str = (typeof TextDecoder !== 'undefined')
                ? new TextDecoder().decode(contents)
                : (imports.byteArray ? imports.byteArray.toString(contents) : String(contents));
            const data = JSON.parse(str);
            if (!data || typeof data !== 'object' ||
                (data.version !== undefined && data.version !== 1) ||
                !data.selections || typeof data.selections !== 'object') {
                Log.warn('État des dispositions ignoré : structure ou version inconnue');
                return;
            }

            for (const key of Object.keys(data.selections)) {
                if (!/^\d+:\d+$/.test(key))
                    continue;
                const value = data.selections[key];
                if (typeof value === 'string' && value !== '')
                    this._selections[key] = value;
            }

            Log.debug(`${Object.keys(this._selections).length} sélection(s) de disposition restaurée(s)`);
        } catch (e) {
            Log.warn(`État des dispositions illisible : ${e}`);
        }
    }

    _key(monitor, workspace) {
        const m = (Number.isInteger(monitor) && monitor >= 0) ? monitor : 0;
        const w = (Number.isInteger(workspace) && workspace >= 0) ? workspace : 0;
        return `${m}:${w}`;
    }

    getSelectedLayout(monitor, workspace) {
        return this._selections[this._key(monitor, workspace)] || null;
    }

    setSelectedLayout(monitor, workspace, layoutId) {
        if (typeof layoutId !== 'string' || layoutId === '')
            return false;

        const key = this._key(monitor, workspace);
        if (this._selections[key] === layoutId)
            return true;

        this._selections[key] = layoutId;
        this.save();
        return true;
    }

    save() {
        try {
            const dir = GLib.build_filenamev([GLib.get_user_config_dir(), 'cinnaflow']);
            const dirFile = Gio.File.new_for_path(dir);
            if (!dirFile.query_exists(null))
                dirFile.make_directory_with_parents(null);

            const data = { version: 1, selections: this._selections };
            const file = Gio.File.new_for_path(this.path);
            file.replace_contents(
                JSON.stringify(data, null, 2) + '\n',
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
        } catch (e) {
            Log.warn(`Impossible d'enregistrer l'état des dispositions : ${e}`);
        }
    }
};
