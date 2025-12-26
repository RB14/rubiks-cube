/**
 * Cube2DRenderer - 2D flattened visualization of the Rubik's Cube
 *
 * Displays the cube state as a classic cross/T pattern:
 *       [U]
 *    [L][F][R][B]
 *       [D]
 *
 * This is a read-only visualization that syncs with the 3D cube state.
 */

import { COLORS } from '../core/RubiksCube.js';

// Face layout in the cross pattern (row, col positions in a 4x3 grid)
const FACE_POSITIONS = {
    U: { row: 0, col: 1 },
    L: { row: 1, col: 0 },
    F: { row: 1, col: 1 },
    R: { row: 1, col: 2 },
    B: { row: 1, col: 3 },
    D: { row: 2, col: 1 },
};

// Color mapping from color key to CSS color
const CSS_COLORS = {
    R: '#c41e3a',  // Red
    L: '#ff5800',  // Orange
    U: '#ffffff',  // White
    D: '#ffd500',  // Yellow
    F: '#0051ba',  // Blue
    B: '#009e60',  // Green
};

export class Cube2DRenderer {
    constructor(container, rubiksCube) {
        this.container = container;
        this.rubiksCube = rubiksCube;
        this.faceElements = {};

        this.init();
    }

    init() {
        this.container.innerHTML = '';
        this.container.classList.add('cube-2d');

        // Create the grid container
        const grid = document.createElement('div');
        grid.className = 'cube-2d-grid';
        this.container.appendChild(grid);

        // Create each face
        for (const [faceName, pos] of Object.entries(FACE_POSITIONS)) {
            const faceEl = this.createFaceElement(faceName);
            faceEl.style.gridRow = pos.row + 1;
            faceEl.style.gridColumn = pos.col + 1;
            grid.appendChild(faceEl);
            this.faceElements[faceName] = faceEl;
        }

        // Initial render
        this.syncWithState();
    }

    createFaceElement(faceName) {
        const face = document.createElement('div');
        face.className = 'cube-2d-face';
        face.dataset.face = faceName;

        // Create 9 cells (3x3 grid)
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const cell = document.createElement('div');
                cell.className = 'cube-2d-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;
                face.appendChild(cell);
            }
        }

        return face;
    }

    /**
     * Get the color at a specific position on a face
     * Maps 2D grid coordinates to 3D cubie positions
     */
    getColorAt(faceName, row, col) {
        // Convert 2D grid position (0-2) to cube coordinates (-1, 0, 1)
        // Row 0 is top, Col 0 is left (when looking at the face)
        const cubies = this.rubiksCube.getCubiesOnFace(faceName);

        // Find the cubie at this grid position
        for (const cubie of cubies) {
            const pos = this.getCubieGridPosition(faceName, cubie);
            if (pos.row === row && pos.col === col) {
                // Get the color on this face
                const colorKey = cubie.faces[faceName];
                return colorKey ? CSS_COLORS[colorKey] : '#111';
            }
        }

        return '#111';  // Fallback
    }

    /**
     * Convert cubie 3D position to 2D grid position for a given face
     */
    getCubieGridPosition(faceName, cubie) {
        // Each face has a different mapping from 3D coords to 2D grid
        // Grid: row 0 = top, col 0 = left (when looking at face from outside)
        switch (faceName) {
            case 'F':  // Looking at +Z
                return { row: 1 - cubie.y, col: cubie.x + 1 };
            case 'B':  // Looking at -Z (from behind, so X is flipped)
                return { row: 1 - cubie.y, col: 1 - cubie.x };
            case 'R':  // Looking at +X
                return { row: 1 - cubie.y, col: 1 - cubie.z };
            case 'L':  // Looking at -X (X flipped)
                return { row: 1 - cubie.y, col: cubie.z + 1 };
            case 'U':  // Looking at +Y (from above)
                return { row: 1 - cubie.z, col: cubie.x + 1 };
            case 'D':  // Looking at -Y (from below)
                return { row: cubie.z + 1, col: cubie.x + 1 };
            default:
                return { row: 1, col: 1 };
        }
    }

    /**
     * Sync the 2D visualization with the current cube state
     */
    syncWithState() {
        for (const [faceName, faceEl] of Object.entries(this.faceElements)) {
            const cells = faceEl.querySelectorAll('.cube-2d-cell');

            cells.forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                const color = this.getColorAt(faceName, row, col);
                cell.style.backgroundColor = color;
            });
        }
    }
}
