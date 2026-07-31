// Provides `Main` as a named export for use across the codebase.
// In Cinnamon, Main is accessed via the global `imports` object.
// The esbuild banner provides: const Main = imports.ui.main;
declare const Main: any;
export { Main };
