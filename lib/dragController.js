/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure drag geometry helpers. The grab-op polling still lives in
// TilingExtension; moving it here is the remaining part of step 5.
var DragController = class DragController {
    // Keep the pointer at the same relative position inside the window while
    // restoring the geometry saved before the window was tiled.
    static computeRestoredRect(savedRect, currentRect, pointer) {
        if (!savedRect || !currentRect || !pointer ||
            currentRect.width <= 0 || currentRect.height <= 0 ||
            savedRect.width <= 0 || savedRect.height <= 0)
            return null;

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const offsetX = clamp((pointer.x - currentRect.x) / currentRect.width, 0, 1);
        const offsetY = clamp((pointer.y - currentRect.y) / currentRect.height, 0, 1);

        return {
            x: Math.round(pointer.x - savedRect.width * offsetX),
            y: Math.round(pointer.y - savedRect.height * offsetY),
            width: Math.max(1, Math.round(savedRect.width)),
            height: Math.max(1, Math.round(savedRect.height)),
        };
    }
};
