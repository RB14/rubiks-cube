/**
 * Rubik's Cube 3D - Main Entry Point
 *
 * Wires together the core logic, renderer, and controls.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RubiksCube } from './core/RubiksCube.js';
import { CubeRenderer } from './renderer/CubeRenderer.js';
import { FaceControls } from './controls/FaceControls.js';

class Game {
    constructor() {
        this.container = document.getElementById('canvas-container');

        // Core logic
        this.cube = new RubiksCube();

        // 3D Renderer
        this.renderer = new CubeRenderer(this.container, this.cube);

        // Orbit controls for camera rotation
        this.orbitControls = new OrbitControls(
            this.renderer.getCamera(),
            this.renderer.getDomElement()
        );
        this.setupOrbitControls();

        // Face rotation controls
        this.faceControls = new FaceControls(this.renderer, this.orbitControls);
        this.faceControls.setOnMoveComplete(() => this.onMoveComplete());

        // UI
        this.setupUI();

        console.log('🧊 Rubik\'s Cube 3D loaded!');
    }

    setupOrbitControls() {
        this.orbitControls.enableDamping = true;
        this.orbitControls.dampingFactor = 0.1;
        this.orbitControls.enablePan = false;
        this.orbitControls.minDistance = 5;
        this.orbitControls.maxDistance = 15;

        // Only allow orbit with right mouse button or two-finger touch
        this.orbitControls.mouseButtons = {
            LEFT: null,
            MIDDLE: THREE.MOUSE.DOLLY,
            RIGHT: THREE.MOUSE.ROTATE,
        };

        // For touch: two-finger rotate, pinch zoom
        this.orbitControls.touches = {
            ONE: null,
            TWO: THREE.TOUCH.DOLLY_ROTATE,
        };

        // Update loop for damping
        const updateOrbit = () => {
            requestAnimationFrame(updateOrbit);
            this.orbitControls.update();
        };
        updateOrbit();
    }

    setupUI() {
        document.getElementById('shuffle-btn').addEventListener('click', () => {
            this.shuffle();
        });

        document.getElementById('reset-btn').addEventListener('click', () => {
            this.reset();
        });
    }

    async shuffle() {
        // Disable controls during shuffle
        this.faceControls.setEnabled(false);

        const faces = ['R', 'L', 'U', 'D', 'F', 'B'];
        const moves = 20;

        for (let i = 0; i < moves; i++) {
            const face = faces[Math.floor(Math.random() * faces.length)];
            const clockwise = Math.random() < 0.5;

            await this.renderer.animateRotation(face, clockwise, 100);
        }

        this.faceControls.setEnabled(true);
    }

    reset() {
        this.cube.reset();
        this.renderer.syncWithState();
        document.getElementById('win-message').classList.remove('show');
    }

    onMoveComplete() {
        // Check for win
        if (this.cube.isSolved()) {
            document.getElementById('win-message').classList.add('show');
            setTimeout(() => {
                document.getElementById('win-message').classList.remove('show');
            }, 3000);
        }
    }
}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
