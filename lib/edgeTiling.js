/*
 * Cinnamon Tiling Shell
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Pure edge/corner geometry. TilingExtension owns the pointer polling and the
// preview actors; this module only decides the target rectangle.
var EdgeTiling = class EdgeTiling {
    static compute(pointer, workArea, layout, mode) {
        if (!EdgeTiling.isModeActive(mode) || !pointer || !workArea ||
            workArea.width <= 0 || workArea.height <= 0)
            return null;

        const EDGE_OFFSET = 16;
        const TOP_OFFSET = 8;
        const CORNER_RATIO = 0.25;

        const left = workArea.x;
        const top = workArea.y;
        const right = workArea.x + workArea.width;
        const bottom = workArea.y + workArea.height;
        const x = Math.max(left, Math.min(right, pointer.x));
        const y = Math.max(top, Math.min(bottom, pointer.y));

        const nearLeft = x <= left + EDGE_OFFSET;
        const nearRight = x >= right - EDGE_OFFSET;
        const nearTop = y <= top + TOP_OFFSET;
        const nearBottom = y >= bottom - EDGE_OFFSET;
        if (!nearLeft && !nearRight && !nearTop && !nearBottom)
            return null;

        const relX = (x - left) / workArea.width;
        const relY = (y - top) / workArea.height;

        // Both adjacent borders: unambiguous corner.
        if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
            return EdgeTiling._corner(nearRight, nearBottom, workArea, layout, mode);
        }

        // Left/right border: quarter corners, then full-height edge.
        if (nearLeft || nearRight) {
            if (relY < CORNER_RATIO)
                return EdgeTiling._corner(nearRight, false, workArea, layout, mode);
            if (relY > 1 - CORNER_RATIO)
                return EdgeTiling._corner(nearRight, true, workArea, layout, mode);
            return EdgeTiling._verticalEdge(nearRight, relY, workArea, layout, mode);
        }

        // Top/bottom border: corner quarters, maximize at top center, bottom
        // edge in the middle.
        if (nearTop) {
            if (relX < CORNER_RATIO)
                return EdgeTiling._corner(false, false, workArea, layout, mode);
            if (relX > 1 - CORNER_RATIO)
                return EdgeTiling._corner(true, false, workArea, layout, mode);
            return {
                rect: {
                    x: left,
                    y: top,
                    width: workArea.width,
                    height: workArea.height,
                },
                maximize: true,
                zone: 'top-center',
            };
        }

        if (relX < CORNER_RATIO)
            return EdgeTiling._corner(false, true, workArea, layout, mode);
        if (relX > 1 - CORNER_RATIO)
            return EdgeTiling._corner(true, true, workArea, layout, mode);
        return EdgeTiling._bottomEdge(relX, workArea, layout, mode);
    }

    static isModeActive(mode) {
        return mode === 'default' || mode === 'adaptive' || mode === 'granular';
    }

    static _corner(east, south, workArea, layout, mode) {
        const zone = (south ? 'bottom-' : 'top-') + (east ? 'right' : 'left');

        // Adaptive and granular modes align corners on the layout tile.
        if (mode !== 'default' && Array.isArray(layout) && layout.length > 0) {
            const tile = EdgeTiling._tileAt(layout, east ? 1 : 0, south ? 1 : 0);
            if (tile)
                return EdgeTiling._result(tile, workArea, zone);
        }

        return {
            rect: EdgeTiling._rect(
                workArea.x + (east ? workArea.width / 2 : 0),
                workArea.y + (south ? workArea.height / 2 : 0),
                workArea.width / 2,
                workArea.height / 2
            ),
            maximize: false,
            zone: zone,
        };
    }

    static _verticalEdge(east, relY, workArea, layout, mode) {
        const zone = east ? 'right' : 'left';

        // Adaptive: the whole left/right column of the current layout.
        if (mode === 'adaptive' && Array.isArray(layout) && layout.length > 0) {
            const column = east
                ? EdgeTiling._rightColumn(layout)
                : EdgeTiling._leftColumn(layout);
            if (column)
                return EdgeTiling._result(column, workArea, zone);
        }

        // Granular: the exact tile under the pointer on that edge.
        if (mode === 'granular' && Array.isArray(layout) && layout.length > 0) {
            const tile = EdgeTiling._tileAt(layout, east ? 1 : 0, relY);
            if (tile)
                return EdgeTiling._result(tile, workArea, zone);
        }

        return {
            rect: EdgeTiling._rect(
                east ? workArea.x + workArea.width / 2 : workArea.x,
                workArea.y,
                workArea.width / 2,
                workArea.height
            ),
            maximize: false,
            zone: zone,
        };
    }

    static _bottomEdge(relX, workArea, layout, mode) {
        // Adaptive: the whole bottom row of the current layout.
        if (mode === 'adaptive' && Array.isArray(layout) && layout.length > 0) {
            const row = EdgeTiling._bottomRow(layout);
            if (row)
                return EdgeTiling._result(row, workArea, 'bottom');
        }

        // Granular: the exact tile under the pointer on the bottom edge.
        if (mode === 'granular' && Array.isArray(layout) && layout.length > 0) {
            const tile = EdgeTiling._tileAt(layout, relX, 1);
            if (tile)
                return EdgeTiling._result(tile, workArea, 'bottom');
        }

        return {
            rect: EdgeTiling._rect(
                workArea.x,
                workArea.y + workArea.height / 2,
                workArea.width,
                workArea.height / 2
            ),
            maximize: false,
            zone: 'bottom',
        };
    }

    static _result(tile, workArea, zone) {
        return {
            rect: EdgeTiling._rect(
                workArea.x + tile.x * workArea.width,
                workArea.y + tile.y * workArea.height,
                tile.width * workArea.width,
                tile.height * workArea.height
            ),
            maximize: false,
            zone: zone,
        };
    }

    static _rect(x, y, width, height) {
        return {
            x: Math.round(x),
            y: Math.round(y),
            width: Math.max(1, Math.round(width)),
            height: Math.max(1, Math.round(height)),
        };
    }

    static _tileAt(layout, relX, relY) {
        let closest = null;
        let closestDistance = Infinity;

        for (const tile of layout) {
            const endX = tile.x + tile.width;
            const endY = tile.y + tile.height;
            if (relX >= tile.x - 1e-6 && relX <= endX + 1e-6 &&
                relY >= tile.y - 1e-6 && relY <= endY + 1e-6)
                return tile;

            const centerX = tile.x + tile.width / 2;
            const centerY = tile.y + tile.height / 2;
            const distance = Math.pow(relX - centerX, 2) + Math.pow(relY - centerY, 2);
            if (distance < closestDistance) {
                closest = tile;
                closestDistance = distance;
            }
        }

        return closest;
    }

    static _leftColumn(layout) {
        const minX = Math.min(...layout.map(tile => tile.x));
        return EdgeTiling._union(layout.filter(tile => Math.abs(tile.x - minX) < 0.01));
    }

    static _rightColumn(layout) {
        const maxEndX = Math.max(...layout.map(tile => tile.x + tile.width));
        return EdgeTiling._union(layout.filter(tile => Math.abs(tile.x + tile.width - maxEndX) < 0.01));
    }

    static _bottomRow(layout) {
        const maxEndY = Math.max(...layout.map(tile => tile.y + tile.height));
        return EdgeTiling._union(layout.filter(tile => Math.abs(tile.y + tile.height - maxEndY) < 0.01));
    }

    static _union(tiles) {
        if (!tiles || tiles.length === 0)
            return null;

        const left = Math.min(...tiles.map(tile => tile.x));
        const top = Math.min(...tiles.map(tile => tile.y));
        const right = Math.max(...tiles.map(tile => tile.x + tile.width));
        const bottom = Math.max(...tiles.map(tile => tile.y + tile.height));
        if (right <= left || bottom <= top)
            return null;

        return {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
        };
    }
};
