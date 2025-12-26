/**
 * CubeRenderer - Three.js 3D visualization of the Rubik's Cube
 */

import * as THREE from 'three';
import { COLORS } from '../core/RubiksCube.js';

// Size constants
const CUBIE_SIZE = 1;
const CUBIE_GAP = 0.05;
const CUBIE_TOTAL = CUBIE_SIZE + CUBIE_GAP;
const STICKER_SIZE = 0.85;
const STICKER_DEPTH = 0.02;
const CORNER_RADIUS = 0.1;

/**
 * Creates a rounded rectangle shape for stickers
 */
function createRoundedRectShape(width, height, radius) {
    const shape = new THREE.Shape();
    const x = -width / 2;
    const y = -height / 2;

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    return shape;
}

export class CubeRenderer {
    constructor(container, rubiksCube) {
        this.container = container;
        this.rubiksCube = rubiksCube;

        this.scene = null;
        this.camera = null;
        this.renderer = null;

        this.cubieMeshes = new Map();
        this.rotationGroup = new THREE.Group();

        this.isAnimating = false;
        this.animationQueue = [];

        this.init();
    }

    init() {
        this.setupScene();
        this.setupCamera();
        this.setupRenderer();
        this.setupLights();
        this.createCube();
        this.startRenderLoop();
        this.handleResize();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.add(this.rotationGroup);
    }

    setupCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);

        // Use max zoom out distance (15) as default to show full cube with room to spare
        const distance = 15;
        const baseDirection = { x: 5, y: 4, z: 6 };
        const baseMagnitude = Math.sqrt(baseDirection.x**2 + baseDirection.y**2 + baseDirection.z**2);
        const scale = distance / baseMagnitude;

        this.camera.position.set(
            baseDirection.x * scale,
            baseDirection.y * scale,
            baseDirection.z * scale
        );
        this.camera.lookAt(0, 0, 0);
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const light1 = new THREE.DirectionalLight(0xffffff, 0.5);
        light1.position.set(5, 10, 7);
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 0.3);
        light2.position.set(-5, -5, -5);
        this.scene.add(light2);
    }

    createCube() {
        this.cubieMeshes.forEach(mesh => this.scene.remove(mesh));
        this.cubieMeshes.clear();

        for (const cubie of this.rubiksCube.getAllCubies()) {
            const mesh = this.createCubieMesh(cubie);
            this.cubieMeshes.set(cubie, mesh);
            this.scene.add(mesh);
        }
    }

    createCubieMesh(cubie) {
        const group = new THREE.Group();

        const baseGeometry = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.3,
            metalness: 0.1,
        });
        const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
        group.add(baseMesh);

        const faceConfigs = [
            { face: 'R', position: [CUBIE_SIZE / 2 + STICKER_DEPTH / 2, 0, 0], rotation: [0, Math.PI / 2, 0] },
            { face: 'L', position: [-CUBIE_SIZE / 2 - STICKER_DEPTH / 2, 0, 0], rotation: [0, -Math.PI / 2, 0] },
            { face: 'U', position: [0, CUBIE_SIZE / 2 + STICKER_DEPTH / 2, 0], rotation: [-Math.PI / 2, 0, 0] },
            { face: 'D', position: [0, -CUBIE_SIZE / 2 - STICKER_DEPTH / 2, 0], rotation: [Math.PI / 2, 0, 0] },
            { face: 'F', position: [0, 0, CUBIE_SIZE / 2 + STICKER_DEPTH / 2], rotation: [0, 0, 0] },
            { face: 'B', position: [0, 0, -CUBIE_SIZE / 2 - STICKER_DEPTH / 2], rotation: [0, Math.PI, 0] },
        ];

        for (const config of faceConfigs) {
            const color = cubie.getColor(config.face);
            if (color !== null) {
                const sticker = this.createSticker(color);
                sticker.position.set(...config.position);
                sticker.rotation.set(...config.rotation);
                sticker.userData.face = config.face;
                group.add(sticker);
            }
        }

        group.position.set(
            cubie.x * CUBIE_TOTAL,
            cubie.y * CUBIE_TOTAL,
            cubie.z * CUBIE_TOTAL
        );

        group.userData.cubie = cubie;

        return group;
    }

    createSticker(color) {
        const shape = createRoundedRectShape(STICKER_SIZE, STICKER_SIZE, CORNER_RADIUS);
        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: STICKER_DEPTH,
            bevelEnabled: false,
        });

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.geometry.center();

        return mesh;
    }

    syncWithState() {
        this.createCube();
    }

    getMeshForCubie(cubie) {
        return this.cubieMeshes.get(cubie);
    }

    animateRotation(face, clockwise, duration = 300) {
        return new Promise((resolve) => {
            if (this.isAnimating) {
                this.animationQueue.push({ face, clockwise, duration, resolve });
                return;
            }

            this.isAnimating = true;

            const cubies = this.rubiksCube.getCubiesOnFace(face);
            const meshes = cubies.map(c => this.cubieMeshes.get(c));

            for (const mesh of meshes) {
                this.scene.remove(mesh);
                this.rotationGroup.add(mesh);
            }

            const axis = this.getRotationAxis(face);
            const angle = (clockwise ? -1 : 1) * Math.PI / 2;
            const targetAngle = angle * this.getRotationDirection(face);

            const startTime = performance.now();
            const startRotation = this.rotationGroup.rotation[axis];

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);

                this.rotationGroup.rotation[axis] = startRotation + targetAngle * eased;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    this.finalizeRotation(meshes, face, clockwise);
                    resolve();
                }
            };

            requestAnimationFrame(animate);
        });
    }

    getRotationAxis(face) {
        switch (face) {
            case 'R': case 'L': case 'M': return 'x';
            case 'U': case 'D': case 'E': return 'y';
            case 'F': case 'B': case 'S': return 'z';
            default: return null;
        }
    }

    /**
     * Get the direction multiplier for rotation based on face
     * Positive axis faces (R, U, F, S) rotate in one direction,
     * Negative axis faces (L, D, B, M, E) rotate in the opposite
     */
    getRotationDirection(face) {
        return ['R', 'U', 'F', 'S'].includes(face) ? 1 : -1;
    }

    /**
     * Clear all meshes from the rotation group back to the scene
     */
    clearRotationGroup() {
        const meshesToMove = [...this.rotationGroup.children];
        for (const mesh of meshesToMove) {
            this.rotationGroup.remove(mesh);
            this.scene.add(mesh);
        }
        this.rotationGroup.rotation.set(0, 0, 0);
    }

    finalizeRotation(meshes, face, clockwise) {
        this.rotationGroup.rotation.set(0, 0, 0);

        for (const mesh of meshes) {
            this.rotationGroup.remove(mesh);
            this.scene.add(mesh);
        }

        this.rubiksCube.rotateFace(face, clockwise);
        this.syncWithState();

        this.isAnimating = false;

        if (this.animationQueue.length > 0) {
            const next = this.animationQueue.shift();
            this.animateRotation(next.face, next.clockwise, next.duration)
                .then(next.resolve);
        }
    }

    setFaceRotation(face, angle) {
        if (this.isAnimating || !face) return;

        const axis = this.getRotationAxis(face);
        if (!axis) return;

        // Clear any previous meshes from rotation group first
        this.clearRotationGroup();

        const cubies = this.rubiksCube.getCubiesOnFace(face);

        for (const cubie of cubies) {
            const mesh = this.cubieMeshes.get(cubie);
            if (mesh) {
                this.scene.remove(mesh);
                this.rotationGroup.add(mesh);
            }
        }

        const direction = this.getRotationDirection(face);
        this.rotationGroup.rotation[axis] = angle * direction;
    }

    snapFaceRotation(face, currentAngle, threshold = Math.PI / 4) {
        return new Promise((resolve) => {
            // Handle invalid face
            if (!face) {
                this.clearRotationGroup();
                resolve(false);
                return;
            }

            const axis = this.getRotationAxis(face);
            if (!axis) {
                this.clearRotationGroup();
                resolve(false);
                return;
            }

            // Prevent new interactions during snap animation
            this.isAnimating = true;

            const shouldComplete = Math.abs(currentAngle) >= threshold;
            const targetAngle = shouldComplete ? Math.sign(currentAngle) * Math.PI / 2 : 0;
            const clockwise = currentAngle < 0;

            const direction = this.getRotationDirection(face);
            const startAngle = currentAngle * direction;
            const endAngle = targetAngle * direction;

            const duration = 150;
            const startTime = performance.now();

            const animate = () => {
                const elapsed = performance.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = this.easeOutCubic(progress);

                this.rotationGroup.rotation[axis] = startAngle + (endAngle - startAngle) * eased;

                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // Clean up rotation group
                    this.clearRotationGroup();

                    if (shouldComplete) {
                        this.rubiksCube.rotateFace(face, clockwise);
                        this.syncWithState();
                    }

                    this.isAnimating = false;
                    resolve(shouldComplete);
                }
            };

            requestAnimationFrame(animate);
        });
    }

    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    startRenderLoop() {
        const render = () => {
            requestAnimationFrame(render);
            this.renderer.render(this.scene, this.camera);
        };
        render();
    }

    handleResize() {
        window.addEventListener('resize', () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });
    }

    getDomElement() {
        return this.renderer.domElement;
    }

    getCamera() {
        return this.camera;
    }

    getScene() {
        return this.scene;
    }
}
