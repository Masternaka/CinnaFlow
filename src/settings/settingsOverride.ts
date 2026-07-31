import { Gio } from '../gi/shared';
import Settings from './settings';

export default class SettingsOverride {
    private static _instance: SettingsOverride | null;

    static get(): SettingsOverride {
        if (!this._instance) this._instance = new SettingsOverride();
        return this._instance;
    }

    static destroy() {
        if (this._instance) {
            this._instance = null;
        }
    }

    public override() {
        // Safe stub for Cinnamon — overrides for Cinnamon window manager (Muffin) if needed
        try {
            const raw = Settings.OVERRIDDEN_SETTINGS;
            // No-op or muffin overrides can be performed here if required
        } catch (_) { /* ignore */ }
    }

    public restore() {
        // Safe stub
    }
}
