// Translations for Cinnamon extensions.
// Cinnamon provides gettext via imports.misc.extensionUtils (same as legacy GNOME).
declare const imports: any;

const _ext = imports?.misc?.extensionUtils;
const _gettextFn: (s: string) => string =
    _ext?.gettext ?? ((s: string) => s);
const _ngettextFn: (s: string, p: string, n: number) => string =
    _ext?.ngettext ?? ((s: string, p: string, n: number) => (n === 1 ? s : p));

export function gettext(str: string): string {
    return _gettextFn(str);
}

export function _(str: string): string {
    return _gettextFn(str);
}

export function ngettext(str: string, strPlural: string, n: number): string {
    return _ngettextFn(str, strPlural, n);
}

export function pgettext(_context: string, str: string): string {
    return _gettextFn(str);
}
