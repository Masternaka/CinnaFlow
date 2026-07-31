// Cinnamon extension base class
// In GNOME Shell the base class is imported from resource:///org/gnome/shell/extensions/extension.js
// In Cinnamon it is a plain JS class with init()/enable()/disable() lifecycle.

export class Extension {
    public metadata: any;
    public uuid: string;
    public path: string;

    constructor(metadata: any) {
        this.metadata = metadata;
        this.uuid = metadata.uuid;
        this.path = metadata.path ?? metadata.dir?.get_path() ?? '';
    }
}

// openPreferences equivalent — in Cinnamon the user opens settings via System Settings GUI
export function openPrefs(_ext?: Extension): void {
    // No programmatic equivalent in Cinnamon
}
