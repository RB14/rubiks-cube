/**
 * RubiksCube - Pure logic and state management
 *
 * This class manages the state of a 3x3 Rubik's cube and provides
 * methods to manipulate it. It has NO rendering dependencies.
 *
 * The cube is represented as 26 cubies (27 minus the invisible center).
 * Each cubie knows its position and the colors on each of its faces.
 *
 * Coordinate system:
 *   X: Right (+) / Left (-)
 *   Y: Up (+) / Down (-)
 *   Z: Front (+) / Back (-)
 *
 * Face mapping:
 *   R (Right):  +X    L (Left):   -X
 *   U (Up):     +Y    D (Down):   -Y
 *   F (Front):  +Z    B (Back):   -Z
 */

// Standard Rubik's cube colors
export const COLORS = {
    R: 0xc41e3a,  // Red - Right face
    L: 0xff5800,  // Orange - Left face
    U: 0xffffff,  // White - Up face
    D: 0xffd500,  // Yellow - Down face
    F: 0x0051ba,  // Blue - Front face
    B: 0x009e60,  // Green - Back face
    X: 0x111111,  // Black - internal faces (not visible)
};

// Face normals in the coordinate system
export const FACE_NORMALS = {
    R: { x: 1, y: 0, z: 0 },
    L: { x: -1, y: 0, z: 0 },
    U: { x: 0, y: 1, z: 0 },
    D: { x: 0, y: -1, z: 0 },
    F: { x: 0, y: 0, z: 1 },
    B: { x: 0, y: 0, z: -1 },
};

// Rotation axes for each face (including middle layers M, E, S)
export const ROTATION_AXES = {
    R: 'x', L: 'x', M: 'x',  // M = Middle (between R and L)
    U: 'y', D: 'y', E: 'y',  // E = Equatorial (between U and D)
    F: 'z', B: 'z', S: 'z',  // S = Standing (between F and B)
};

/**
 * Represents a single cubie (small cube) in the Rubik's cube
 */
export class Cubie {
    constructor(x, y, z) {
        // Position in the cube (-1, 0, or 1 for each axis)
        this.x = x;
        this.y = y;
        this.z = z;

        // Colors on each face (null if internal)
        this.faces = {
            R: x === 1 ? 'R' : null,
            L: x === -1 ? 'L' : null,
            U: y === 1 ? 'U' : null,
            D: y === -1 ? 'D' : null,
            F: z === 1 ? 'F' : null,
            B: z === -1 ? 'B' : null,
        };
    }

    /**
     * Get the color of a specific face
     */
    getColor(face) {
        const colorKey = this.faces[face];
        return colorKey ? COLORS[colorKey] : null;
    }

    /**
     * Rotate this cubie around an axis
     * @param {string} axis - 'x', 'y', or 'z'
     * @param {boolean} clockwise - Direction of rotation (when looking at positive axis)
     */
    rotate(axis, clockwise) {
        const dir = clockwise ? 1 : -1;

        // Rotate position
        switch (axis) {
            case 'x':
                [this.y, this.z] = [this.z * dir, -this.y * dir];
                // Rotate face colors
                if (clockwise) {
                    [this.faces.U, this.faces.F, this.faces.D, this.faces.B] =
                        [this.faces.F, this.faces.D, this.faces.B, this.faces.U];
                } else {
                    [this.faces.U, this.faces.F, this.faces.D, this.faces.B] =
                        [this.faces.B, this.faces.U, this.faces.F, this.faces.D];
                }
                break;

            case 'y':
                [this.x, this.z] = [-this.z * dir, this.x * dir];
                if (clockwise) {
                    [this.faces.F, this.faces.L, this.faces.B, this.faces.R] =
                        [this.faces.R, this.faces.F, this.faces.L, this.faces.B];
                } else {
                    [this.faces.F, this.faces.L, this.faces.B, this.faces.R] =
                        [this.faces.L, this.faces.B, this.faces.R, this.faces.F];
                }
                break;

            case 'z':
                [this.x, this.y] = [this.y * dir, -this.x * dir];
                if (clockwise) {
                    [this.faces.U, this.faces.R, this.faces.D, this.faces.L] =
                        [this.faces.L, this.faces.U, this.faces.R, this.faces.D];
                } else {
                    [this.faces.U, this.faces.R, this.faces.D, this.faces.L] =
                        [this.faces.R, this.faces.D, this.faces.L, this.faces.U];
                }
                break;
        }

        // Round to handle floating point errors
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        this.z = Math.round(this.z);
    }

    /**
     * Clone this cubie
     */
    clone() {
        const copy = new Cubie(this.x, this.y, this.z);
        copy.faces = { ...this.faces };
        return copy;
    }
}

/**
 * Main Rubik's Cube class
 */
export class RubiksCube {
    constructor() {
        this.cubies = [];
        this.moveHistory = [];
        this.init();
    }

    /**
     * Initialize/reset the cube to solved state
     */
    init() {
        this.cubies = [];
        this.moveHistory = [];

        // Create 26 cubies (skip the center at 0,0,0)
        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && y === 0 && z === 0) continue;
                    this.cubies.push(new Cubie(x, y, z));
                }
            }
        }
    }

    /**
     * Reset to solved state
     */
    reset() {
        this.init();
    }

    /**
     * Get cubies that belong to a specific face/layer
     * @param {string} face - 'R', 'L', 'U', 'D', 'F', 'B', 'M', 'E', or 'S'
     */
    getCubiesOnFace(face) {
        return this.cubies.filter(cubie => {
            switch (face) {
                case 'R': return cubie.x === 1;
                case 'L': return cubie.x === -1;
                case 'M': return cubie.x === 0;  // Middle layer (between R and L)
                case 'U': return cubie.y === 1;
                case 'D': return cubie.y === -1;
                case 'E': return cubie.y === 0;  // Equatorial layer (between U and D)
                case 'F': return cubie.z === 1;
                case 'B': return cubie.z === -1;
                case 'S': return cubie.z === 0;  // Standing layer (between F and B)
                default: return false;
            }
        });
    }

    /**
     * Get cubie at specific position
     */
    getCubieAt(x, y, z) {
        return this.cubies.find(c => c.x === x && c.y === y && c.z === z);
    }

    /**
     * Rotate a face
     * @param {string} face - Which face to rotate
     * @param {boolean} clockwise - Direction (true = clockwise when looking at face)
     */
    rotateFace(face, clockwise = true) {
        const axis = ROTATION_AXES[face];
        const cubies = this.getCubiesOnFace(face);

        // For L, D, B faces, clockwise when looking at the face
        // is actually counter-clockwise in our coordinate system
        // M follows L, E follows D, S follows F
        const positiveAxisFaces = ['R', 'U', 'F', 'S'];  // S follows F direction
        const actualClockwise = positiveAxisFaces.includes(face) ? clockwise : !clockwise;

        for (const cubie of cubies) {
            cubie.rotate(axis, actualClockwise);
        }

        this.moveHistory.push({ face, clockwise });
    }

    /**
     * Execute a move using standard notation
     * @param {string} move - e.g., "R", "R'", "R2", "U", "F'", etc.
     */
    move(notation) {
        const face = notation[0].toUpperCase();
        const modifier = notation.slice(1);

        let times = 1;
        let clockwise = true;

        if (modifier === "'") {
            clockwise = false;
        } else if (modifier === "2") {
            times = 2;
        }

        for (let i = 0; i < times; i++) {
            this.rotateFace(face, clockwise);
        }
    }

    /**
     * Check if cube is solved
     */
    isSolved() {
        const faces = ['R', 'L', 'U', 'D', 'F', 'B'];

        for (const face of faces) {
            const cubies = this.getCubiesOnFace(face);
            const colors = cubies.map(c => c.faces[face]).filter(c => c !== null);

            if (colors.length === 0) continue;

            const firstColor = colors[0];
            if (!colors.every(c => c === firstColor)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Shuffle the cube
     * @param {number} moves - Number of random moves
     */
    shuffle(moves = 25) {
        const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
        let lastFace = null;

        for (let i = 0; i < moves; i++) {
            // Pick a random face (avoid same face twice in a row)
            let face;
            do {
                face = faces[Math.floor(Math.random() * faces.length)];
            } while (face === lastFace);

            const clockwise = Math.random() < 0.5;
            this.rotateFace(face, clockwise);
            lastFace = face;
        }

        this.moveHistory = []; // Clear history after shuffle
    }

    /**
     * Get all cubies
     */
    getAllCubies() {
        return this.cubies;
    }
}
