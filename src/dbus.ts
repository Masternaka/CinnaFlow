const node = `<node>
    <interface name="org.Cinnamon.Extensions.TilingShell">
        <method name="openLayoutEditor" />
    </interface>
</node>`;

import { Gio } from './gi/ext';

export default class DBus {
    private _dbus: any = null;

    public enable(ext: unknown): void {
        if (this._dbus) return;
        try {
            this._dbus = Gio.DBusExportedObject.wrapJSObject(node, ext);
            this._dbus.export(
                Gio.DBus.session,
                '/org/Cinnamon/Extensions/TilingShell',
            );
        } catch (e) {
            console.error('[tilingshell] DBus export failed:', e);
        }
    }

    public disable(): void {
        try { this._dbus?.flush(); } catch (_) { /* ignore */ }
        try { this._dbus?.unexport(); } catch (_) { /* ignore */ }
        this._dbus = null;
    }
}
