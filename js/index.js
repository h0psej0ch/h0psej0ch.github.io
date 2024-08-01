//Import the THREE.js library
import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
// To allow for the camera to move around the scene
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
// To allow for importing the .gltf file
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const loader = new GLTFLoader();

const container = document.getElementById('model');

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let object;
let controls;
let renderer;
let hoverObject;

function init() {
    renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        powerPreference: "high-performance",
        precision: "highp"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    camera.position.z = 1;

    const topLight = new THREE.DirectionalLight(0xffffff, 1);
    topLight.position.set(0, 500, 500);
    scene.add(topLight);

    controls = new OrbitControls(camera, renderer.domElement);

    loadModel();

    window.addEventListener("resize", onWindowResize);
    renderer.domElement.addEventListener("pointerdown", onPointerMove);
}

function loadModel() {
    loader.load(
        'models/Cat/Cat.gltf', 
        function (gltf) {
            object = gltf.scene;
            scene.add(object);
            
            // Center and scale the model
            const box = new THREE.Box3().setFromObject(object);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1 / maxDim;
            object.scale.setScalar(scale);
            object.position.sub(center.multiplyScalar(scale));
            
            // // Create a simplified geometry for hover detection
            // const geometry = new THREE.BoxGeometry(size.x * scale, size.y * scale, size.z * scale);
            // const material = new THREE.MeshBasicMaterial({ visible: false });
            // hoverObject = new THREE.Mesh(geometry, material);
            // hoverObject.position.copy(object.position);
            // scene.add(hoverObject);
            
            // Adjust camera
            const distance = 1.5 / Math.tan((camera.fov * Math.PI) / 360);
            camera.position.z = distance;
            
            animate();
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error happened', error);
        }
    );
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function onPointerMove(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(pointer, camera);
    if (object) {
        const intersects = raycaster.intersectObject(object);
        if (intersects.length > 0) {
            console.log('hovered');
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

init();