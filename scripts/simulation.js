/*
 * Simulation portable de la logique de CinnaFlow.
 *
 * Le fichier est exécuté par Node.js ou par JavaScriptCore (osascript) depuis
 * la racine du dépôt. Il remplace les imports Cinnamon/Gio par un système de
 * fichiers et un importeur GJS en mémoire, puis vérifie le moteur de
 * dispositions, l'état persistant et le chargement des modules. Il ne remplace
 * pas la recette Cinnamon/X11 : aucune API de fenêtre, aucun acteur St et aucun
 * signal Muffin ne sont exercés.
 */

(function () {
    'use strict';

    const failures = [];
    const logs = [];

    function check(name, condition, detail) {
        if (condition)
            return true;
        failures.push(detail ? `${name} — ${detail}` : name);
        return false;
    }

    function equal(name, actual, expected) {
        const actualText = JSON.stringify(actual);
        const expectedText = JSON.stringify(expected);
        return check(name, actualText === expectedText, `attendu ${expectedText}, obtenu ${actualText}`);
    }

    function loadSource(path) {
        if (typeof require === 'function') {
            return require('fs').readFileSync(path, 'utf8');
        }
        if (typeof ObjC !== 'undefined') {
            ObjC.import('Foundation');
            const file = $.NSString.stringWithContentsOfFileEncodingError(
                path, $.NSUTF8StringEncoding, null
            );
            if (!file)
                throw new Error(path + ' illisible');
            return file.js;
        }
        throw new Error('Node.js ou JavaScriptCore est requis pour la simulation.');
    }

    // ── Système de fichiers en mémoire ────────────────────────────────────
    const files = new Map();
    const dirs = new Set(['/']);

    function normalizePath(path) {
        const absolute = String(path).startsWith('/');
        const parts = String(path).split('/');
        const result = [];
        for (const part of parts) {
            if (part === '' || part === '.')
                continue;
            if (part === '..') {
                if (result.length > 0)
                    result.pop();
                continue;
            }
            result.push(part);
        }
        return (absolute ? '/' : '') + result.join('/') || '/';
    }

    function dirname(path) {
        const normalized = normalizePath(path);
        if (normalized === '/')
            return '/';
        const index = normalized.lastIndexOf('/');
        return index <= 0 ? '/' : normalized.slice(0, index);
    }

    function addDir(path) {
        let current = normalizePath(path);
        while (!dirs.has(current)) {
            dirs.add(current);
            if (current === '/')
                break;
            current = dirname(current);
        }
    }

    function writeFile(path, contents) {
        const normalized = normalizePath(path);
        files.set(normalized, String(contents));
        addDir(dirname(normalized));
    }

    function readFile(path) {
        return files.get(normalizePath(path));
    }

    function joinPaths(parts) {
        return normalizePath(parts.join('/'));
    }

    function makeFile(path) {
        const normalized = normalizePath(path);
        return {
            query_exists() {
                return files.has(normalized) || dirs.has(normalized);
            },
            make_directory_with_parents() {
                addDir(normalized);
            },
            enumerate_children() {
                const prefix = normalized === '/' ? '/' : normalized + '/';
                const names = [];
                for (const filePath of files.keys()) {
                    if (!filePath.startsWith(prefix))
                        continue;
                    const rest = filePath.slice(prefix.length);
                    if (rest !== '' && rest.indexOf('/') === -1)
                        names.push(rest);
                }
                names.sort();
                let index = 0;
                return {
                    next_file() {
                        if (index >= names.length)
                            return null;
                        const name = names[index++];
                        return { get_name: () => name };
                    },
                    close() {},
                };
            },
            get_child(name) {
                return makeFile(joinPaths([normalized, name]));
            },
            load_contents() {
                const contents = files.get(normalized);
                if (contents === undefined)
                    return [false, null];
                return [true, { __text: contents }];
            },
            replace_contents(contents) {
                writeFile(normalized, contents);
                return [true, null];
            },
            get_path() {
                return normalized;
            },
        };
    }

    const Gio = {
        File: { new_for_path: path => makeFile(path) },
        FileQueryInfoFlags: { NONE: 0 },
        FileCreateFlags: { NONE: 0 },
    };

    const GLib = {
        get_user_config_dir: () => '/home/test/.config',
        build_filenamev: parts => joinPaths(parts),
    };

    const imports = {
        ui: { main: {}, settings: {}, popupMenu: {} },
        gi: { St: {}, Meta: {}, Gio, GLib, Clutter: {} },
        byteArray: {
            toString: value => (value && value.__text !== undefined) ? value.__text : String(value),
        },
    };

    const globalStub = {
        log: message => logs.push(String(message)),
        logWarning: message => logs.push(String(message)),
        logError: message => logs.push(String(message)),
    };

    function TextDecoder() {}
    TextDecoder.prototype.decode = function (contents) {
        if (contents && typeof contents.__text === 'string')
            return contents.__text;
        return String(contents);
    };

    // ── Chargeur de modules GJS simulé ────────────────────────────────────
    // Les modules accèdent à leurs voisins par Me.imports.lib.<module>.
    const extensionStub = { imports: { lib: {} } };
    imports.ui.extension = { getCurrentExtension: () => extensionStub };
    const lib = extensionStub.imports.lib;

    function evaluateModule(path, exportName) {
        const source = loadSource(path);
        check(`${path} : export var ${exportName}`,
            new RegExp(`^var ${exportName} (?:=|\\{)`, 'm').test(source));
        const factory = new Function(
            'imports', 'global', 'TextDecoder',
            source + `\nreturn { ${exportName}: ${exportName} };`
        );
        return factory(imports, globalStub, TextDecoder);
    }

    lib.log = evaluateModule('lib/log.js', 'Log');
    lib.edgeTiling = evaluateModule('lib/edgeTiling.js', 'EdgeTiling');
    lib.dragController = evaluateModule('lib/dragController.js', 'DragController');
    lib.layoutEngine = evaluateModule('lib/layoutEngine.js', 'LayoutEngine');
    lib.state = evaluateModule('lib/state.js', 'LayoutState');
    lib.windowTracker = evaluateModule('lib/windowTracker.js', 'WindowTracker');
    lib.preview = evaluateModule('lib/preview.js', 'PreviewOverlay');
    lib.snapAssistant = evaluateModule('lib/snapAssistant.js', 'SnapAssistant');
    lib.indicator = evaluateModule('lib/indicator.js', 'IndicatorManager');
    lib.tilingExtension = evaluateModule('lib/tilingExtension.js', 'TilingExtension');

    // Compile et exécute les points d'entrée ; ils résolvent TilingExtension
    // par le même chargeur simulé que Cinnamon.
    new Function('imports', 'global', 'TextDecoder', loadSource('extension.js'))(
        imports, globalStub, TextDecoder
    );

    const api = {
        LayoutEngine: lib.layoutEngine.LayoutEngine,
        LayoutState: lib.state.LayoutState,
        TilingExtension: lib.tilingExtension.TilingExtension,
        EdgeTiling: lib.edgeTiling.EdgeTiling,
        DragController: lib.dragController.DragController,
    };

    const layoutsDir = '/home/test/.config/cinnaflow/layouts';
    const statePath = '/home/test/.config/cinnaflow/state.json';

    // ── Moteur de dispositions ────────────────────────────────────────────
    const engine = new api.LayoutEngine();

    check('dossier des dispositions créé', dirs.has(layoutsDir));
    check('disposition d’exemple créée', files.has(layoutsDir + '/sample-ultrawide.json'));
    equal('quatre presets et l’exemple', engine.getKeys().length, 5);
    equal('exemple chargé', engine.get('custom-ultrawide-center').length, 3);
    check('presets avec groups', engine.get('two-columns').every(tile => Array.isArray(tile.groups)));

    const tilingShellLayouts = [
        {
            id: 'split-half',
            tiles: [
                { x: 0, y: 0, width: 0.5, height: 1, groups: [2] },
                { x: 0.5, y: 0, width: 0.5, height: 1, groups: [1] },
            ],
        },
        {
            id: 'split-thirds',
            tiles: [
                { x: 0, y: 0, width: 1 / 3, height: 1, groups: [2, 3] },
                { x: 1 / 3, y: 0, width: 1 / 3, height: 1, groups: [3, 1] },
                { x: 2 / 3, y: 0, width: 1 / 3, height: 1, groups: [2, 1] },
            ],
        },
        {
            id: 'out-of-range',
            tiles: [
                { x: 1.2, y: -1, width: 0.8, height: 0.2, groups: 'invalid' },
                { x: 0, y: 0, width: 0.1, height: 0.1, groups: [1, '2', 1.9, -3] },
            ],
        },
    ];

    writeFile(layoutsDir + '/tilingshell.json', JSON.stringify(tilingShellLayouts));
    writeFile(layoutsDir + '/legacy.json', JSON.stringify({
        id: 'legacy',
        name: 'Héritée',
        rects: [{ x: 0, y: 0, w: 0.4, h: 1 }],
    }));
    writeFile(layoutsDir + '/broken.json', '{ ce fichier n’est pas du JSON');
    engine.loadCustomLayouts();

    check('collection Tiling Shell importée',
        engine.getKeys().indexOf('custom-split-half') !== -1 &&
        engine.getKeys().indexOf('custom-split-thirds') !== -1);
    equal('libellé depuis id', engine.getLabel('custom-split-half'), 'split-half');
    equal('groups préservés', engine.get('custom-split-half').map(tile => tile.groups), [[2], [1]]);
    equal('groups multiples préservés', engine.get('custom-split-thirds')[0].groups, [2, 3]);
    equal('coordonnées hors limites normalisées', engine.get('custom-out-of-range')[0], {
        x: 0.99, y: 0, width: 0.01, height: 0.2, groups: [],
    });
    equal('groups invalides filtrés', engine.get('custom-out-of-range')[1].groups, [1, 2]);
    equal('format hérité name/rects/w/h', engine.get('custom-legacy')[0], {
        x: 0, y: 0, width: 0.4, height: 1, groups: [],
    });
    equal('libellé hérité', engine.getLabel('custom-legacy'), 'Héritée');
    check('JSON invalide ignoré', engine.getKeys().indexOf('custom-broken') === -1);
    check('avertissement JSON invalide', logs.some(line => line.indexOf('broken.json') !== -1));

    // Export compatible Tiling Shell : tableau d’une disposition, cinq champs.
    const exportedPath = '/home/test/export-split-half.json';
    check('export réussi', engine.exportLayout('custom-split-half', exportedPath));
    const exported = JSON.parse(readFile(exportedPath));
    check('export sous forme de collection', Array.isArray(exported) && exported.length === 1);
    equal('identifiant exporté', exported[0].id, 'split-half');
    equal('propriétés de la disposition', Object.keys(exported[0]).sort(), ['id', 'tiles']);
    equal('tuiles exportées', exported[0].tiles.map(tile => tile.groups), [[2], [1]]);
    equal('propriétés des tuiles', Object.keys(exported[0].tiles[0]).sort(),
        ['groups', 'height', 'width', 'x', 'y']);
    check('export d’une disposition absente refusé', engine.exportLayout('missing', '/home/test/none.json') === false);

    const legacyExportPath = '/home/test/export-legacy.json';
    check('export d’une disposition héritée', engine.exportLayout('custom-legacy', legacyExportPath));
    equal('libellé utilisé comme identifiant', JSON.parse(readFile(legacyExportPath))[0].id, 'Héritée');

    const presetExportPath = '/home/test/export-preset.json';
    check('export d’un preset', engine.exportLayout('two-columns', presetExportPath));
    equal('libellé du preset exporté', JSON.parse(readFile(presetExportPath))[0].id, 'Deux colonnes');

    // Réimport du fichier exporté dans le dossier utilisateur.
    writeFile(layoutsDir + '/roundtrip.json', readFile(legacyExportPath));
    engine.loadCustomLayouts();
    check('export réimporté', engine.getKeys().indexOf('custom-Héritée') !== -1);
    equal('géométrie conservée au réimport', engine.get('custom-Héritée')[0].width, 0.4);

    // ── Tuilage aux bords (géométrie pure) ────────────────────────────────
    const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
    const twoCols = engine.get('two-columns');
    const gridLayout = engine.get('grid');
    const mainStack = engine.get('main-stack');

    const topCenter = api.EdgeTiling.compute({ x: 960, y: 2 }, workArea, twoCols, 'default');
    equal('bord haut : maximise', topCenter.maximize, true);
    equal('bord haut : rectangle plein écran', topCenter.rect,
        { x: 0, y: 0, width: 1920, height: 1080 });
    equal('bord haut : zone', topCenter.zone, 'top-center');

    equal('coin haut gauche : quart', api.EdgeTiling.compute({ x: 2, y: 2 }, workArea, twoCols, 'default').rect,
        { x: 0, y: 0, width: 960, height: 540 });
    equal('bord gauche : moitié', api.EdgeTiling.compute({ x: 2, y: 540 }, workArea, twoCols, 'default').rect,
        { x: 0, y: 0, width: 960, height: 1080 });
    equal('bord droit : moitié', api.EdgeTiling.compute({ x: 1918, y: 540 }, workArea, twoCols, 'default').rect,
        { x: 960, y: 0, width: 960, height: 1080 });
    equal('bord bas : moitié', api.EdgeTiling.compute({ x: 960, y: 1078 }, workArea, twoCols, 'default').rect,
        { x: 0, y: 540, width: 1920, height: 540 });
    check('centre : aucune cible', api.EdgeTiling.compute({ x: 960, y: 540 }, workArea, twoCols, 'default') === null);
    check('mode désactivé', api.EdgeTiling.compute({ x: 2, y: 540 }, workArea, twoCols, 'off') === null);
    check('mode inconnu ignoré', api.EdgeTiling.compute({ x: 2, y: 540 }, workArea, twoCols, 'inconnu') === null);
    check('zone de travail nulle ignorée', api.EdgeTiling.compute({ x: 2, y: 540 }, { x: 0, y: 0, width: 0, height: 1080 }, twoCols, 'default') === null);

    equal('adaptatif : colonne gauche', api.EdgeTiling.compute({ x: 2, y: 540 }, workArea, mainStack, 'adaptive').rect,
        { x: 0, y: 0, width: 1190, height: 1080 });
    equal('adaptatif : colonne droite', api.EdgeTiling.compute({ x: 1918, y: 540 }, workArea, mainStack, 'adaptive').rect,
        { x: 1190, y: 0, width: 730, height: 1080 });
    equal('adaptatif : ligne basse', api.EdgeTiling.compute({ x: 960, y: 1078 }, workArea, gridLayout, 'adaptive').rect,
        { x: 0, y: 540, width: 1920, height: 540 });
    equal('adaptatif : coin', api.EdgeTiling.compute({ x: 2, y: 2 }, workArea, gridLayout, 'adaptive').rect,
        { x: 0, y: 0, width: 960, height: 540 });

    equal('granulaire : tuile gauche', api.EdgeTiling.compute({ x: 2, y: 270 }, workArea, gridLayout, 'granular').rect,
        { x: 0, y: 0, width: 960, height: 540 });
    equal('granulaire : tuile basse', api.EdgeTiling.compute({ x: 1440, y: 1078 }, workArea, gridLayout, 'granular').rect,
        { x: 960, y: 540, width: 960, height: 540 });
    equal('granulaire : coin droit', api.EdgeTiling.compute({ x: 1918, y: 2 }, workArea, gridLayout, 'granular').rect,
        { x: 960, y: 0, width: 960, height: 540 });

    // ── Restauration de la taille d'origine (géométrie pure) ──────────────
    equal('restauration : conserve le point sous le pointeur',
        api.DragController.computeRestoredRect(
            { x: 100, y: 120, width: 800, height: 600 },
            { x: 0, y: 0, width: 960, height: 1080 },
            { x: 480, y: 540 }
        ),
        { x: 80, y: 240, width: 800, height: 600 });
    equal('restauration : pointeur au coin',
        api.DragController.computeRestoredRect(
            { x: 100, y: 120, width: 800, height: 600 },
            { x: 0, y: 0, width: 960, height: 1080 },
            { x: 0, y: 0 }
        ),
        { x: 0, y: 0, width: 800, height: 600 });
    check('restauration : géométrie invalide ignorée',
        api.DragController.computeRestoredRect(
            { x: 0, y: 0, width: 800, height: 600 },
            { x: 0, y: 0, width: 0, height: 1080 },
            { x: 10, y: 10 }
        ) === null);

    // ── État persistant par moniteur et espace de travail ─────────────────
    const state = new api.LayoutState();
    equal('état initial vide', state.getSelectedLayout(0, 0), null);
    check('sélection enregistrée', state.setSelectedLayout(0, 0, 'grid'));
    check('seconde sélection enregistrée', state.setSelectedLayout(1, 2, 'two-columns'));
    equal('sélection moniteur 0 / espace 0', state.getSelectedLayout(0, 0), 'grid');
    equal('sélection moniteur 1 / espace 2', state.getSelectedLayout(1, 2), 'two-columns');
    equal('espace non sélectionné', state.getSelectedLayout(0, 1), null);
    check('sélection vide refusée', state.setSelectedLayout(0, 0, '') === false);

    const storedState = JSON.parse(readFile(statePath));
    equal('version du fichier d’état', storedState.version, 1);
    equal('clé moniteur:espace', storedState.selections['0:0'], 'grid');

    const reloaded = new api.LayoutState();
    equal('sélection restaurée après redémarrage', reloaded.getSelectedLayout(0, 0), 'grid');
    equal('seconde sélection restaurée', reloaded.getSelectedLayout(1, 2), 'two-columns');

    reloaded.setSelectedLayout(-1, -2.5, 'two-columns');
    equal('indices invalides normalisés', reloaded.getSelectedLayout(0, 0), 'two-columns');

    writeFile(statePath, '{ état corrompu');
    const recovered = new api.LayoutState();
    equal('état corrompu ignoré', recovered.getSelectedLayout(0, 0), null);
    check('état corrompu signalé', logs.some(line => line.indexOf('illisible') !== -1));
    check('état réécrit après corruption', recovered.setSelectedLayout(0, 0, 'grid'));
    equal('état réécrit relu', new api.LayoutState().getSelectedLayout(0, 0), 'grid');

    // ── Intégration de TilingExtension (sans API Cinnamon) ────────────────
    const extension = new api.TilingExtension();
    const preference = { layout: 'grid' };
    extension.settings = {
        getValue(key) {
            return key === 'layout' ? preference.layout : undefined;
        },
        setValue(key, value) {
            if (key === 'layout')
                preference.layout = value;
        },
    };

    equal('préférence utilisée comme défaut', extension._resolveLayoutId(2, 2), 'grid');
    check('sélection ciblée enregistrée', extension._selectLayout('two-columns', 2, 2));
    equal('sélection ciblée prioritaire', extension._resolveLayoutId(2, 2), 'two-columns');
    equal('préférence synchronisée', preference.layout, 'two-columns');
    equal('sélection ciblée persistée', new api.LayoutState().getSelectedLayout(2, 2), 'two-columns');

    // Export actif : la disposition par défaut grid, puis un second export
    // pour vérifier que le fichier précédent n’est pas écrasé.
    equal('disposition active du bureau', extension._getActiveSelection().layoutId, 'grid');
    equal('nom de fichier sans accents', extension._slugify('Héritée'), 'heritee');
    extension._exportActiveLayout();
    extension._exportActiveLayout();
    check('export actif créé', files.has(layoutsDir + '/exports/grille-2-x-2.json'));
    check('second export non écrasé', files.has(layoutsDir + '/exports/grille-2-x-2-2.json'));
    equal('export actif au bon format',
        JSON.parse(readFile(layoutsDir + '/exports/grille-2-x-2.json'))[0].id,
        'Grille 2 x 2');

    check('cycle de vie simulé sans erreur', (() => {
        try {
            extension.disable();
            return true;
        } catch (e) {
            return false;
        }
    })());

    // Doublons d’identifiant : le premier fichier rencontré est conservé.
    for (const filePath of Array.from(files.keys())) {
        if (filePath.startsWith(layoutsDir + '/'))
            files.delete(filePath);
    }
    writeFile(layoutsDir + '/01-first.json', JSON.stringify({
        id: 'same-id',
        tiles: [{ x: 0, y: 0, width: 0.4, height: 1, groups: [] }],
    }));
    writeFile(layoutsDir + '/02-second.json', JSON.stringify({
        id: 'same-id',
        tiles: [{ x: 0, y: 0, width: 0.9, height: 1, groups: [] }],
    }));
    const duplicateEngine = new api.LayoutEngine();
    equal('premier identifiant conservé', duplicateEngine.get('custom-same-id')[0].width, 0.4);
    check('identifiant en double signalé', logs.some(line => line.indexOf('identifiant en double') !== -1));

    // ── Résultat ──────────────────────────────────────────────────────────
    if (failures.length > 0) {
        for (const failure of failures)
            console.log('  FAIL ' + failure);
        throw new Error(`${failures.length} échec(s) de simulation`);
    }

    console.log(`  ${engine.getKeys().length} dispositions, export, état, bords et drag vérifiés`);
})();
