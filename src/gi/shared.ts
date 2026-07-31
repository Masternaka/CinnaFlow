// In Cinnamon, GI libraries come from the global `imports` object at runtime.
// The esbuild banner injects `const Gio = imports.gi.Gio;` etc. before the bundle,
// so these variables are available as globals when the extension runs.
// We declare them here only for TypeScript compilation — they resolve to `any`.

declare const Gio: any;
declare const GLib: any;
declare const GObject: any;

export { Gio, GLib, GObject };
