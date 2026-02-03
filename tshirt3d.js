import * as THREE from 'https://cdn.skypack.dev/three@0.132.2/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { DecalGeometry } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/geometries/DecalGeometry.js';

let scene, camera, renderer, controls;
let tshirtModel = null;
let currentDecal = null;
const TSHIRT_COLOR_WHITE = 0xffffff;
const TSHIRT_COLOR_BLACK = 0x1a1a1a;

export function init3DViewer() {
    createModal();
    setupScene();
    setupLights();
    loadTShirtModel();
    setupEventListeners();
}

function createModal() {
    const modalHTML = `
        <div id="modal-3d" class="modal-overlay hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>3D Preview</h2>
                    <button id="close-3d-btn" class="close-btn">&times;</button>
                </div>
                <div id="canvas-container-3d"></div>
                <div class="modal-controls">
                    <div class="control-group">
                        <label>T-Shirt Color:</label>
                        <div class="color-options">
                            <button class="color-btn white active" data-color="white"></button>
                            <button class="color-btn black" data-color="black"></button>
                        </div>
                    </div>
                </div>
                <div class="loading-overlay hidden" id="loading-3d">
                    <div class="spinner"></div>
                    <p>Loading 3D Model...</p>
                </div>
            </div>
        </div>
    `;
    if (!document.getElementById('modal-3d')) {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
}

function setupScene() {
    const container = document.getElementById('canvas-container-3d');

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf2f2f7);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.5, 2.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.0;
    controls.maxDistance = 5;
    controls.enablePan = false;

    window.addEventListener('resize', onWindowResize, false);

    animate();
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 2, 2);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 0, 2);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.4);
    backLight.position.set(0, 2, -2);
    scene.add(backLight);
}

function loadTShirtModel() {
    const loader = new GLTFLoader();
    const loadingEl = document.getElementById('loading-3d');
    const modelUrl = 'assets/black-tshirt-1.0.glb';

    loadingEl.classList.remove('hidden');

    loader.load(modelUrl, function (gltf) {
        tshirtModel = gltf.scene;

        const box = new THREE.Box3().setFromObject(tshirtModel);
        const center = box.getCenter(new THREE.Vector3());
        tshirtModel.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2.5 / maxDim;
        tshirtModel.scale.set(scale, scale, scale);

        tshirtModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                const oldMat = node.material;
                node.material = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.6,
                    metalness: 0.1,
                    normalMap: oldMat.normalMap || null,
                    aoMap: oldMat.aoMap || null,
                    side: THREE.DoubleSide
                });
            }
        });

        scene.add(tshirtModel);
        loadingEl.classList.add('hidden');

    }, undefined, function (error) {
        console.error('An error occurred loading the model:', error);
        loadingEl.innerHTML = '<p style="color:red">Error loading 3D Model</p>';
    });
}

// Helper to set color
function setShirtColor(colorName) {
    if (!tshirtModel) return;
    const hex = colorName === 'black' ? TSHIRT_COLOR_BLACK : TSHIRT_COLOR_WHITE;
    tshirtModel.traverse((node) => {
        if (node.isMesh) {
            node.material.color.setHex(hex);
        }
    });
    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.color === colorName);
    });
}

function applyTexture(canvasDataUrl, side = 'front') {
    if (!tshirtModel) return;

    if (currentDecal) {
        scene.remove(currentDecal);
        if (currentDecal.geometry) currentDecal.geometry.dispose();
        if (currentDecal.material) currentDecal.material.dispose();
        currentDecal = null;
    }

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(canvasDataUrl, (texture) => {
        texture.encoding = THREE.sRGBEncoding;

        let mesh = null;
        tshirtModel.traverse((node) => {
            if (node.isMesh && !mesh) mesh = node;
        });
        if (!mesh) return;

        const box = new THREE.Box3().setFromObject(tshirtModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // 2. RAYCASTING for accurate placement
        const raycaster = new THREE.Raycaster();
        let origin, direction;

        const targetY = center.y + size.y * 0.15; // Upper chest

        if (side === 'back') {
            origin = new THREE.Vector3(0, targetY, box.min.z - 2);
            direction = new THREE.Vector3(0, 0, 1);
        } else {
            origin = new THREE.Vector3(0, targetY, box.max.z + 2);
            direction = new THREE.Vector3(0, 0, -1);
        }

        raycaster.set(origin, direction);
        const intersects = raycaster.intersectObjects(tshirtModel.children, true);

        let position = new THREE.Vector3();
        let orientation = new THREE.Euler();

        if (intersects.length > 0) {
            position.copy(intersects[0].point);
            if (side === 'back') {
                orientation = new THREE.Euler(0, Math.PI, 0);
            } else {
                orientation = new THREE.Euler(0, 0, 0);
            }
        } else {
            // Fallback
            position = new THREE.Vector3(0, targetY, side === 'back' ? box.min.z : box.max.z);
            orientation = new THREE.Euler(0, side === 'back' ? Math.PI : 0, 0);
        }

        // --- SIZE & DEPTH ---
        // Scale to 1.0 (100% of shirt width)
        const decalScale = 1.0;
        const decalWidth = size.x * decalScale;
        const decalHeight = size.x * decalScale;
        const decalDepth = size.z * 0.2; // SMALL DEPTH

        const decalSize = new THREE.Vector3(decalWidth, decalHeight, decalDepth);

        const material = new THREE.MeshPhongMaterial({
            map: texture,
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            shininess: 0,
            specular: 0x000000,
            side: THREE.DoubleSide
        });

        const geometry = new DecalGeometry(mesh, position, orientation, decalSize);
        const decal = new THREE.Mesh(geometry, material);
        scene.add(decal);
        currentDecal = decal;
    });
}

export function open3DView(designURL, options = {}) {
    const modal = document.getElementById('modal-3d');
    if (modal) {
        modal.classList.remove('hidden');
        onWindowResize();

        // 1. Sync Color
        if (options.color) {
            setShirtColor(options.color);
        }

        // 2. Apply Design to Correct Side
        if (designURL) {
            const viewSide = options.view || 'front';
            applyTexture(designURL, viewSide);

            // 3. Auto-Rotate Camera to show the correct side
            if (viewSide === 'back') {
                camera.position.set(0, 0.5, -2.5); // Move camera to back
                camera.lookAt(0, 0, 0);
            } else {
                camera.position.set(0, 0.5, 2.5); // Move camera to front
                camera.lookAt(0, 0, 0);
            }
        }
    }
}

function onWindowResize() {
    const container = document.getElementById('canvas-container-3d');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function setupEventListeners() {
    document.getElementById('close-3d-btn').addEventListener('click', () => {
        document.getElementById('modal-3d').classList.add('hidden');
    });

    document.querySelectorAll('.color-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const color = e.target.dataset.color;
            setShirtColor(color);
        });
    });
}
