import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer';
import { RenderPass } from 'three/addons/postprocessing/RenderPass';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment';

const BACKGROUND: THREE.Color   = new THREE.Color(0x24273a);
const MODEL: string             = "Guitar/Guitar.glb"; 

export class threeScene {
    private canvas: HTMLCanvasElement;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private mainObject: THREE.Object;
    private outline: THREE.OutlinePass;
    private composer: THREE.EffectComposer;

    constructor(loading_screen: loadingScreen) {
        this.canvas = document.getElementById("three-canvas");
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initThreeJS();

        this.load3DContent(loading_screen);
        this.setupOutline();

        this.onMouseMovement();
        this.onWindowResize();
    }

    private initThreeJS(): void {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.camera.position.x = 0;
        this.camera.position.y = 0;
        this.camera.position.z = 1.5;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        const environment = new RoomEnvironment( this.renderer );
        const pmremGenerator = new THREE.PMREMGenerator( this.renderer );
        this.scene.environment = pmremGenerator.fromScene( environment ).texture;
        this.scene.environmentIntensity = 1.5;
        
        this.renderer.setClearColor(0x000000, 0);

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Remove or reduce your current directional light
        const topLight = new THREE.DirectionalLight(0xffffff, 0.3); // Reduced intensity
        topLight.position.set(5, 5, 5);
        this.scene.add(topLight);

        // Add ambient light for base illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Add a second directional light from different angle
        const sideLight = new THREE.DirectionalLight(0xffffff, 0.2);
        sideLight.position.set(-5, 0, 5);
        this.scene.add(sideLight);
    }

    private load3DContent(loading_screen: loadingScreen): void {
        const loader = new GLTFLoader();
        loader.load(
            '/models/' + MODEL,
            (gltf) => {
                this.mainObject = gltf.scene;
                this.mainObject.rotation.y = Math.PI / 2;
                this.mainObject.rotation.z = Math.PI / 2;
                this.scene.add(this.mainObject);

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(this.mainObject);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                this.mainObject.scale.setScalar(scale);
                this.mainObject.position.sub(center.multiplyScalar(scale));

                this.animate();
            },
            (xhr) => {
                loading_screen.loadPercentage = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            function (error) {
                console.error('An error happened', error);
            }
        );
    }

    private setupOutline(): void {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        this.outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        this.outlinePass.edgeStrength = 2;
        this.outlinePass.edgeGlow = 1;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 0;
        this.outlinePass.visibleEdgeColor.set('#ff0000');
        this.composer.addPass(this.outlinePass);
    }

    private onMouseMovement(): void {
        
        window.addEventListener('mousemove', (event) => {

            this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	        this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
             
            this.raycaster.setFromCamera(this.mouse, this.camera);

            const intersects = this.raycaster.intersectObjects(this.scene.children, true);
            if (intersects.length > 0) {
                this.outlinePass.selectedObjects = [this.mainObject]
            } else {
                this.outlinePass.selectedObjects = []
            }
        
        });
    }

    private onWindowResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);
        this.composer.render(this.scene, this.camera);
    };
}
