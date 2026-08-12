import { St } from '../gi/ext';
import Indicator from './indicator';
import { createButton } from './utils';
declare const PopupMenu: any;
import CurrentMenu from './currentMenu';
import { _ } from '../translations';
import { widgetOrientation } from '../utils/gnomesupport';

export default class EditingMenu implements CurrentMenu {
    private readonly _indicator: Indicator;

    constructor(
        indicator: Indicator,
        saveCallback: () => void,
        cancelCallback: () => void,
    ) {
        this._indicator = indicator;

        const boxLayout = new St.BoxLayout({
            styleClass: 'buttons-box-layout',
            xExpand: true,
            style: 'spacing: 8px',
            ...widgetOrientation(true),
        });

        const openMenuBtn = createButton(
            'menu-symbolic',
            _('Menu'),
            this._indicator.path,
        );
        openMenuBtn.connect('clicked', () => this._indicator.openMenu(false));
        boxLayout.add_child(openMenuBtn);

        const infoMenuBtn = createButton(
            'info-symbolic',
            _('Info'),
            this._indicator.path,
        );
        infoMenuBtn.connect('clicked', () => this._indicator.openMenu(true));
        boxLayout.add_child(infoMenuBtn);

        const saveBtn = createButton(
            'save-symbolic',
            _('Save'),
            this._indicator.path,
        );
        saveBtn.connect('clicked', () => {
            this._indicator.menu.toggle();
            saveCallback();
        });
        boxLayout.add_child(saveBtn);

        const cancelBtn = createButton(
            'cancel-symbolic',
            _('Cancel'),
            this._indicator.path,
        );
        cancelBtn.connect('clicked', () => {
            this._indicator.menu.toggle();
            cancelCallback();
        });
        boxLayout.add_child(cancelBtn);

        const menuItem = new PopupMenu.PopupBaseMenuItem({
            style_class: 'indicator-menu-item',
        });
        menuItem.add_child(boxLayout);

        (this._indicator.menu as any).addMenuItem(menuItem);
    }

    destroy(): void {
        (this._indicator.menu as any).removeAll();
    }
}
