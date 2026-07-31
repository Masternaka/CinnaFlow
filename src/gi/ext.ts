// All GI libraries for the Cinnamon extension runtime.
// The esbuild banner (in esbuild.mjs) injects these as globals before the bundle runs:
//   const Clutter = imports.gi.Clutter; etc.
// This file just re-exports them so TypeScript can compile imports like:
//   import { Meta, Clutter } from '../gi/ext';

import { Gio, GLib, GObject } from './shared';

declare const Clutter: any;
declare const Meta: any;
declare const Mtk: any;
declare const Cinnamon: any;
declare const Shell: any;   // alias → imports.gi.Cinnamon
declare const St: any;
declare const Graphene: any;
declare const Atk: any;
declare const Pango: any;

export {
    Clutter,
    Gio,
    GLib,
    GObject,
    Meta,
    Mtk,
    Cinnamon,
    Shell,   // kept for source compatibility; same as Cinnamon
    St,
    Graphene,
    Atk,
    Pango,
};
