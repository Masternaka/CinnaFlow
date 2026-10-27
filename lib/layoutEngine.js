/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Extension = imports.ui.extension;
const Me = Extension.getCurrentExtension();
const Log = Me.imports.lib.log.Log;

var LayoutEngine = class LayoutEngine {
    constructor() {
        this._presets = {
            'two-columns': [
                { x: 0, y: 0, width: 0.5, height: 1, groups: [] },
                { x: 0.5, y: 0, width: 0.5, height: 1, groups: [] },
            ],
            'main-stack': [
                { x: 0, y: 0, width: 0.62, height: 1, groups: [] },
                { x: 0.62, y: 0, width: 0.38, height: 0.5, groups: [] },
                { x: 0.62, y: 0.5, width: 0.38, height: 0.5, groups: [] },
            ],
            'three-columns': [
                { x: 0, y: 0, width: 1 / 3, height: 1, groups: [] },
                { x: 1 / 3, y: 0, width: 1 / 3, height: 1, groups: [] },
                { x: 2 / 3, y: 0, width: 1 / 3, height: 1, groups: [] },
            ],
            grid: [
                { x: 0, y: 0, width: 0.5, height: 0.5, groups: [] },
                { x: 0.5, y: 0, width: 0.5, height: 0.5, groups: [] },
                { x: 0, y: 0.5, width: 0.5, height: 0.5, groups: [] },
                { x: 0.5, y: 0.5, width: 0.5, height: 0.5, groups: [] },
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
        this._sourceIds = {};

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

            const filenames = [];
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const filename = info.get_name();
                if (filename.endsWith('.json'))
                    filenames.push(filename);
            }
            enumerator.close(null);

            // Deterministic order makes duplicate-identifier handling and the
            // menu order stable across sessions and filesystems.
            filenames.sort();
            for (const filename of filenames) {
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
                    Log.error(`Erreur de lecture de la disposition ${filename} : ${err}`);
                }
            }
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
                    { x: 0, y: 0, width: 0.22, height: 1, groups: [] },
                    { x: 0.22, y: 0, width: 0.56, height: 1, groups: [] },
                    { x: 0.78, y: 0, width: 0.22, height: 1, groups: [] },
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

        const hasRawId = item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
        const rawId = hasRawId
            ? String(item.id).trim()
            : (filename ? filename.replace(/\.json$/i, '') : 'custom');
        const name = String(item.name || item.title || rawId);
        const rawTiles = item.tiles || item.rects || [];

        if (!Array.isArray(rawTiles) || rawTiles.length === 0)
            return;

        // Preserve the historical `custom-` prefix so layouts selected before
        // the per-monitor state existed keep resolving. Tiling Shell exports
        // keep their own identifier when it already starts with that prefix.
        const id = rawId.startsWith('custom-') ? rawId : 'custom-' + rawId;

        if (this._sourceIds[id] !== undefined) {
            Log.warn(`Disposition ignorée : identifiant en double « ${rawId} » (${filename || 'sans fichier'})`);
            return;
        }

        const validTiles = [];
        const roundCoord = value => Math.round(value * 1000000) / 1000000;
        const numberOr = (value, fallback) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : fallback;
        };
        for (const t of rawTiles) {
            if (!t || typeof t !== 'object')
                continue;

            // Tiling Shell uses `width`/`height`; accept `w`/`h` from older
            // hand-written files as well. Keep every tile inside [0, 1].
            const x = roundCoord(Math.max(0, Math.min(0.99, numberOr(t.x, 0))));
            const y = roundCoord(Math.max(0, Math.min(0.99, numberOr(t.y, 0))));
            const width = roundCoord(Math.max(0.01, Math.min(1 - x, numberOr(t.width !== undefined ? t.width : t.w, 0.5))));
            const height = roundCoord(Math.max(0.01, Math.min(1 - y, numberOr(t.height !== undefined ? t.height : t.h, 0.5))));
            const groups = Array.isArray(t.groups)
                ? t.groups
                    .map(group => Number(group))
                    .filter(group => Number.isInteger(group) && group >= 0)
                : [];

            validTiles.push({ x, y, width, height, groups });
        }

        if (validTiles.length > 0) {
            this.layouts[id] = validTiles;
            this.labels[id] = name;
            this._sourceIds[id] = rawId;
        }
    }

    // Tiling Shell imports a JSON *collection* of layouts. Export one layout
    // as a single-element array so the file can be imported upstream unchanged.
    exportLayout(id, targetPath) {
        const tiles = this.layouts[id];
        if (!tiles)
            return false;

        const data = [{
            id: this.labels[id] || this._sourceIds[id] || id,
            tiles: tiles.map(tile => ({
                x: tile.x,
                y: tile.y,
                width: tile.width,
                height: tile.height,
                groups: Array.isArray(tile.groups) ? tile.groups.slice() : [],
            })),
        }];

        try {
            const file = Gio.File.new_for_path(targetPath);
            file.replace_contents(
                JSON.stringify(data, null, 4) + '\n',
                null,
                false,
                Gio.FileCreateFlags.NONE,
                null
            );
            return true;
        } catch (e) {
            Log.warn(`Échec de l'export de ${id} : ${e}`);
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
};
