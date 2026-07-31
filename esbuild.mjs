import { build } from 'esbuild';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const distDir = 'dist';

// Banner injected at the top of the bundled file.
// Provides all Cinnamon/GI globals that the TS source code references.
const cinnamonBanner = `'use strict';
// ─── Cinnamon GI bindings ───────────────────────────────────────────────────
const Gio        = imports.gi.Gio;
const GLib       = imports.gi.GLib;
const GObject    = imports.gi.GObject;
const Clutter    = imports.gi.Clutter;
const Meta       = imports.gi.Meta;
const Mtk        = imports.gi.Mtk ?? {
    Rectangle: function(p = {}) { return new imports.gi.Meta.Rectangle(p); }
};
const St         = imports.gi.St;
const Shell      = imports.gi.Cinnamon;   // Shell → Cinnamon
const Cinnamon   = imports.gi.Cinnamon;
const Graphene   = imports.gi.Graphene;
const Atk        = imports.gi.Atk;
const Pango      = imports.gi.Pango;
// ─── Cinnamon UI modules ─────────────────────────────────────────────────────
const Main          = imports.ui.main;
const PanelMenu     = imports.ui.panelMenu;
const PopupMenu     = imports.ui.popupMenu;
const ModalDialog   = imports.ui.modalDialog;
const SwitcherPopup = imports.ui.switcherPopup;
const AltTab        = imports.ui.altTab;
const Config        = imports.misc.config;
const CinnamonSettings = imports.ui.settings;
// ─── Workspace manager compat (GNOME: workspaceManager / Cinnamon: workspace_manager)
if (!global.workspaceManager && global.workspace_manager)
    global.workspaceManager = global.workspace_manager;
`;

// esbuild plugin: mark all gi:// and resource:/// imports as external
// so they don't get bundled — they resolve to the banner globals above.
const cinnamonExternalPlugin = {
    name: 'cinnamon-externals',
    setup(build) {
        // gi:// → already handled by banner (Gio, Meta, etc. are globals)
        build.onResolve({ filter: /^gi:\/\// }, args => ({
            path: args.path,
            external: true,
            namespace: 'cinnamon-gi',
        }));

        // resource:/// → handled by banner globals
        build.onResolve({ filter: /^resource:\/\// }, args => ({
            path: args.path,
            external: true,
            namespace: 'cinnamon-resource',
        }));
    },
};

async function copyAssets() {
    await fs.mkdir(distDir, { recursive: true });

    // Copy metadata.json
    await fs.copyFile('metadata.json', path.join(distDir, 'metadata.json'));

    // Copy settings-schema.json
    if (fsSync.existsSync('settings-schema.json')) {
        await fs.copyFile('settings-schema.json', path.join(distDir, 'settings-schema.json'));
    }

    // Copy stylesheet.css if present
    if (fsSync.existsSync('stylesheet.css')) {
        await fs.copyFile('stylesheet.css', path.join(distDir, 'stylesheet.css'));
    }

    // Copy resources/ (icons etc.)
    if (fsSync.existsSync('resources')) {
        await fs.cp('resources', path.join(distDir, 'resources'), { recursive: true });
    }

    // Copy translations/
    if (fsSync.existsSync('translations')) {
        await fs.cp('translations', path.join(distDir, 'translations'), { recursive: true });
    }

    console.log('✓ Assets copied to dist/');
}

async function buildExtension() {
    await build({
        entryPoints: ['src/extension.ts'],
        bundle: true,
        format: 'cjs',
        platform: 'node',
        outfile: path.join(distDir, 'extension.js'),
        banner: { js: cinnamonBanner },
        plugins: [cinnamonExternalPlugin],
        // Keep class names for GObject registration
        keepNames: true,
        // Do not minify — Cinnamon needs readable identifiers for GObject
        minify: false,
        treeShaking: false,
        logLevel: 'info',
        // Suppress warnings about gi:// externals
        external: [],
    });
    console.log('✓ extension.js built');
}

async function main() {
    await fs.mkdir(distDir, { recursive: true });
    await Promise.all([buildExtension(), copyAssets()]);
    console.log('✓ Build complete → dist/');
}

main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
