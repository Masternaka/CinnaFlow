/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const Main = imports.ui.main;
const St = imports.gi.St;

// ---------------------------------------------------------------------------
// SnapAssistant — mini-bar floating at the top of the screen during a drag.
// Shows one card per layout, each card containing proportional mini-tiles.
// ---------------------------------------------------------------------------
var SnapAssistant = class SnapAssistant {
    constructor() {
        this._bar = null;
        this._cards = [];    // [{ layoutId, tileActors: [{ actor, tileIndex }], cardActor }]
        this._built = false;
        this._monitor = -1;
        this._barHeight = 0;
        this._active = null; // { layoutId, tileIndex } currently highlighted
    }

    // Pointer zone keeping the bar reachable. The bar is taller than the
    // 35 px minimum, so hovering its lower part must not fall back to the
    // classic snap zone.
    getActivationHeight() {
        return Math.max(35, this._barHeight + 4);
    }

    matchesMonitor(monitor) {
        return this._monitor === monitor;
    }

    // Build (or rebuild) the bar from the current LayoutEngine state.
    buildFor(layoutEngine, monitor, workArea) {
        this._destroyBar();
        this._monitor = monitor;

        this._bar = new St.BoxLayout({
            style_class: 'snap-assistant-bar',
            vertical: false,
            reactive: false,
        });

        const keys = layoutEngine.getKeys();

        keys.forEach(layoutId => {
            const tiles = layoutEngine.get(layoutId);

            const card = new St.Widget({
                style_class: 'snap-assistant-card',
                reactive: false,
            });

            const tileActors = [];

            tiles.forEach((tile, tileIndex) => {
                const tileActor = new St.Widget({
                    style_class: 'snap-assistant-tile',
                    reactive: false,
                });

                const CARD_W = 96;
                const CARD_H = 60;
                tileActor.set_position(
                    Math.round(tile.x * CARD_W),
                    Math.round(tile.y * CARD_H)
                );
                tileActor.set_size(
                    Math.max(1, Math.round(tile.width * CARD_W) - 2),
                    Math.max(1, Math.round(tile.height * CARD_H) - 2)
                );

                card.add_actor(tileActor);
                tileActors.push({ actor: tileActor, tileIndex });
            });

            card.set_size(96, 60);
            this._bar.add_actor(card);
            this._cards.push({ layoutId, tileActors, cardActor: card });
        });

        Main.uiGroup.add_actor(this._bar);

        // Centre the bar horizontally at the top of the work area
        const barWidth = keys.length * (96 + 8);
        const barX = Math.round(workArea.x + (workArea.width - barWidth) / 2);
        const barY = workArea.y + 2;
        this._bar.set_position(barX, barY);

        let barHeight = 0;
        try {
            [, barHeight] = this._bar.get_preferred_height(-1);
        } catch (e) {
            barHeight = 0;
        }
        this._barHeight = barHeight > 0 ? barHeight : 80;

        this._bar.hide();
        this._built = true;
    }

    // Given absolute pointer coords, return { layoutId, tileIndex } or null.
    findHoveredTile(px, py) {
        if (!this._bar || !this._built)
            return null;

        for (const { layoutId, tileActors, cardActor } of this._cards) {
            let cx, cy;
            if (cardActor.get_transformed_position) {
                [cx, cy] = cardActor.get_transformed_position();
            } else {
                [cx, cy] = [this._bar.x + cardActor.x, this._bar.y + cardActor.y];
            }
            const cw = cardActor.width;
            const ch = cardActor.height;

            if (px >= cx && px < cx + cw && py >= cy && py < cy + ch) {
                for (const { actor, tileIndex } of tileActors) {
                    let tx, ty;
                    if (actor.get_transformed_position) {
                        [tx, ty] = actor.get_transformed_position();
                    } else {
                        [tx, ty] = [cx + actor.x, cy + actor.y];
                    }
                    const tw = actor.width;
                    const th = actor.height;
                    if (px >= tx && px < tx + tw && py >= ty && py < ty + th) {
                        return { layoutId, tileIndex };
                    }
                }
                return { layoutId, tileIndex: 0 };
            }
        }
        return null;
    }

    highlightTile(layoutId, tileIndex) {
        if (this._active &&
            this._active.layoutId === layoutId &&
            this._active.tileIndex === tileIndex)
            return;

        this._setActive(layoutId, tileIndex);
    }

    clearHighlights() {
        this._setActive(null, -1);
    }

    // Toggles the highlight on at most two actors (previous and new) instead
    // of sweeping every tile of every layout on each drag tick. Every tile
    // keeps its base 'snap-assistant-tile' class permanently.
    _setActive(layoutId, tileIndex) {
        if (this._active) {
            this._applyActive(this._active.layoutId, this._active.tileIndex, false);
            this._active = null;
        }
        if (layoutId !== null && tileIndex >= 0) {
            this._applyActive(layoutId, tileIndex, true);
            this._active = { layoutId, tileIndex };
        }
    }

    _applyActive(layoutId, tileIndex, active) {
        for (const { layoutId: lid, tileActors } of this._cards) {
            if (lid !== layoutId)
                continue;

            for (const { actor, tileIndex: ti } of tileActors) {
                if (ti !== tileIndex)
                    continue;

                if (active)
                    actor.add_style_class_name('snap-assistant-tile-active');
                else
                    actor.remove_style_class_name('snap-assistant-tile-active');
                return;
            }
        }
    }

    isVisible() {
        return this._bar ? this._bar.visible : false;
    }

    show() {
        if (this._bar)
            this._bar.show();
    }

    hide() {
        if (this._bar && this._bar.visible) {
            this.clearHighlights();
            this._bar.hide();
        }
    }

    _destroyBar() {
        if (this._bar) {
            this._bar.destroy();
            this._bar = null;
        }
        this._cards = [];
        this._built = false;
        this._monitor = -1;
        this._barHeight = 0;
        this._active = null;
    }

    destroy() {
        this._destroyBar();
    }
};
