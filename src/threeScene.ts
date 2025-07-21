import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { PMREMGenerator } from 'three';
import { Tween, Easing } from '@tweenjs/tween.js';

import { loadingScreen } from './loadingScreen';

const GUITAR: string    = "Guitar"
const PLIMPOES: string  = "Plimpoes";
const TREE: string      = "Tree";
const IBN: string       = "IBN";

const BACKGROUND: THREE.Color           = new THREE.Color(0x24273a);
const MODEL: string                     = "scene.glb"; 
const HIGHLIGHTS: Array<string>         = [GUITAR, PLIMPOES, TREE, IBN];
const IDLE_ANIMATIONS: Array<string>    = ["TurnHead"];
const CAMERA_BASE: {
            pos: THREE.Vector3;
            rot: THREE.Vector3;
            focal: number;
            grroty: number;
        }                               = {pos: new THREE.Vector3(0, 0.5, 1.5), rot: new THREE.Vector3(- Math.PI / 8, 0, 0), focal: 15.114682208599307, grroty: 0}

export class threeScene {
    private canvas: HTMLCanvasElement;
    private camera!: THREE.PerspectiveCamera;
    private focussedObject: THREE.Mesh | null = null;
    private cameraGroup!: THREE.Group;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private scene!: THREE.Scene;
    private renderer!: THREE.WebGLRenderer;
    private pmremGenerator!: THREE.PMREMGenerator;
    private mainObject!: THREE.Object3D;
    private materials: THREE.Material[] = [];
    private materialMap: Map<string, THREE.Material[]> = new Map();
    private outlinePass!: OutlinePass;
    private composer!: EffectComposer;
    private highlightObjects!: Array<number>;
    private animations!: Map<string, THREE.AnimationAction>;
    private mixer!: THREE.AnimationMixer;
    private clock: THREE.Clock;
    private tweens!: Array<Tween>;
    private cameraMoveTween: Tween | null = null;

    constructor(loading_screen: loadingScreen) {
        this.canvas = document.getElementById("three-canvas")! as HTMLCanvasElement;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.initThreeJS();
        this.load3DContent(loading_screen);
        this.setupOutline();
        this.onMouseMovement();
        this.onWindowResize();
        this.onClick();
        this.clock = new THREE.Clock();
    }

    private initThreeJS(): void {
        this.tweens = [];
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraGroup = new THREE.Group();
        this.cameraGroup.add(this.camera);
        this.scene.add(this.cameraGroup);

        this.camera.position.x = CAMERA_BASE.pos.x;
        this.camera.position.y = CAMERA_BASE.pos.y;
        this.camera.position.z = CAMERA_BASE.pos.z;

        this.camera.rotation.x = CAMERA_BASE.rot.x;
        
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });

        this.pmremGenerator = new PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        // Create neutral environment similar to reference
        const environment = new RoomEnvironment();
        const envTexture = this.pmremGenerator.fromScene(environment).texture;
        this.scene.environment = envTexture;
        this.scene.environmentIntensity = 0.3;

        // Skybox
        const skyboxLoader = new THREE.CubeTextureLoader();
        this.scene.background = skyboxLoader.load([
            '/skybox/1.png',
            '/skybox/3.png',
            '/skybox/5.png',
            '/skybox/6.png',
            '/skybox/2.png',
            '/skybox/4.png'
        ])

        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Config renderer so things look better
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMappingExposure = 0;

        this.setupLights(); 
    }

    private load3DContent(loading_screen: loadingScreen): void {
        const loader = new GLTFLoader();
        loader.load(
            '/models/' + MODEL,
            (gltf: GLTF) => {
                this.mainObject = gltf.scene;
                this.mainObject.children.forEach((ch) => {
                    let tempList: THREE.Material[] = [];
                    ch.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            tempList.push(child.material)
                        }
                    });
                    this.materials = this.materials.concat(tempList);
                    this.materialMap.set(ch.name, tempList);
                });
                console.log("MATERIALS");
                console.log(this.materials);
                this.mainObject.rotation.y = - Math.PI / 4;
                //this.mainObject.rotation.z = Math.PI / 2;
                //this.mainObject.rotation.x = Math.PI / 2;
                this.materials.forEach(element => {
                    element.transparent = true;
                });              
                this.scene.add(this.mainObject);

                this.mixer = new THREE.AnimationMixer(this.mainObject);
                this.animations = new Map<string, THREE.AnimationAction>(
                    gltf.animations.map((clip: THREE.AnimationClip) => [clip.name, this.mixer.clipAction(clip)])
                );
                console.log(this.animations);
                const rest = this.animations.get("StandRest")!;
                const sitDown = this.animations.get("Standup")!;
                sitDown.timeScale = -1;
                sitDown.clampWhenFinished = true;
                sitDown.repetitions = 1;
                console.log(sitDown.getClip().duration);
                
                this.highlightObjects = [];
                console.log(this.mainObject);
                console.log(this.mainObject.children);
                this.mainObject.children.forEach((obj) => {
                    if (HIGHLIGHTS.includes(obj.name)) {
                        this.highlightObjects.push(obj.id);
                    }
                    if (obj instanceof THREE.Mesh) {
                        console.log("hjehe");
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });

                console.log(this.highlightObjects);

                // Center and scale the model
                const box = new THREE.Box3().setFromObject(this.mainObject);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 2 / maxDim;
                this.mainObject.scale.setScalar(scale);
                this.mainObject.position.sub(center.multiplyScalar(scale));


                loading_screen.set_done().then(() => {
                    rest.play();
                    requestAnimationFrame(this.animate);
                    // Pop scene into play
                    let popinValues = {scale: 0, opacity: 0} // Start at nothing with no oppacity
                    const popinTween = new Tween(popinValues)
                        .to({scale: scale, opacity: 1}, 1000)
                        .easing(Easing.Quadratic.InOut)
                        .onUpdate(() => {
                            this.mainObject.scale.setScalar(popinValues.scale);
                            this.materials.forEach(element => {
                                element.opacity = popinValues.opacity;
                            });              
                        })
                        .start();
                    this.tweens.push(popinTween);

                    // Start sitdown, and animations after popin
                    setTimeout(() => {
                        rest.stop();
                        sitDown.play();
                        this.idleAnimation();
                    }, 800)
                });

            },
            (xhr) => {
                loading_screen.loadPercentage = Math.floor((xhr.loaded / xhr.total) * 100);
                console.log("Loaded: " + xhr.loaded);
                console.log("Total:  " + xhr.total);
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            function (error) {
                console.error('An error happened', error);
            }
        );
    }

    private setupOutline(): void {
        // Setup composer/renderPass
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // OutlinePass for the outline on highlighted objects
        this.outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        this.outlinePass.edgeStrength = 2;
        this.outlinePass.edgeGlow = 1;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 0;
        this.outlinePass.visibleEdgeColor.set('#ffffff');
        this.composer.addPass(this.outlinePass);

        // OutputPass
        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);
    }

    private setupLights(): void {
        const light1 = new THREE.AmbientLight(0xffffff, 0.3);
        light1.name = 'ambient_light';
        this.scene.add(light1);

        const light2 = new THREE.DirectionalLight(0xffffff, 2.5);
        light2.position.set(0.5, 0, 0.866); // ~60º
        light2.name = 'main_light';
        this.scene.add(light2);
    }

    private idleAnimation() {
        const delay = 1000 * (Math.random() * 10 + 5)
        setTimeout(() => {
            const anim = IDLE_ANIMATIONS[Math.floor(Math.random() * IDLE_ANIMATIONS.length)]
            const action = this.animations.get(anim)!;
            action.repetitions = 1;
            action.reset(); // Reset the action to allow it to play again
            action.play();
            this.idleAnimation();
        }, delay);

        console.log("animation in " + delay);
    }

    private onMouseMovement(): void {
        
        window.addEventListener('mousemove', (event) => {
            if (this.focussedObject == null) {

                this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
                this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;


                this.cameraGroup.rotation.y =  (-this.mouse.x / 4 * (Math.PI / 4));
                
                this.raycaster.setFromCamera(this.mouse, this.camera);

                const intersects = this.raycaster.intersectObjects(this.scene.children, true);
                if (intersects.length > 0) {
                    this.outlinePass.selectedObjects = intersects.map(value => this.parentObject(value.object)).filter(value => this.highlightObjects.includes(value.id));
                } else {
                    this.outlinePass.selectedObjects = []
                }
            }
        });
    }

    private parentObject(obj: THREE.Object3D): THREE.Object3D {
        if (obj.parent == this.mainObject) {
            return obj;
        } else {
            return this.parentObject(obj.parent!);
        }
    }

    private onWindowResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            
            // Update effect composer and outline pass size
            this.composer.setSize(window.innerWidth, window.innerHeight);
            this.outlinePass.resolution.set(window.innerWidth, window.innerHeight);
        });
    }

    private onClick() {
        window.addEventListener('click', (e) => {
            if (this.outlinePass.selectedObjects.length > 0) {
                e.preventDefault();
                let selected: THREE.Mesh = this.outlinePass.selectedObjects[0] as THREE.Mesh;
                this.focussedObject = selected;
                this.hideAllBut(selected);
                switch (selected.name) {
                    case GUITAR:
                        console.log(GUITAR);
                        break;
                    case PLIMPOES:
                        console.log(PLIMPOES);
                        break;
                    case TREE:
                        console.log(TREE);
                        break;
                    case IBN:
                        console.log(IBN);
                        this.moveCamera({pos: new THREE.Vector3(0.04, 0.13, -0.22), rot: new THREE.Vector3(0, Math.PI / 4, 0), focal: 30, grroty: 0})
                        break;
                }
            }
        })
        window.addEventListener('keydown', (e) => {
            if (e.key == "Escape" && !(this.focussedObject == null)) {
                this.moveCamera(CAMERA_BASE)
                this.focussedObject = null;
                this.materials.forEach((mat) => {
                    mat.opacity = 1;
                })
            }
        })
    }

    private moveCamera(
        target: {
            pos: THREE.Vector3;
            rot: THREE.Vector3;
            focal: number;
            grroty: number;
        }): void {
        console.log(this.camera.getFocalLength())
        this.cameraMoveTween = null;
        let cameraTranslation = {pos: this.camera.position, rot: this.camera.rotation, focal: this.camera.getFocalLength(), grroty: this.cameraGroup.rotation.y}
        let tween = new Tween(cameraTranslation)
            .to(target, 1000)
            .onUpdate(() => {
                this.camera.position.x = cameraTranslation.pos.x
                this.camera.position.y = cameraTranslation.pos.y
                this.camera.position.z = cameraTranslation.pos.z
                this.camera.rotation.x = cameraTranslation.rot.x
                this.camera.rotation.y = cameraTranslation.rot.y
                this.camera.rotation.z = cameraTranslation.rot.z
                this.camera.setFocalLength(cameraTranslation.focal);
                this.cameraGroup.rotation.y = cameraTranslation.grroty
            }).start();
        this.cameraMoveTween = tween;
    }

    private hideAllBut(mesh: THREE.Mesh): void {
        console.log(mesh.name);
        console.log(this.materialMap.get(mesh.name));
        console.log(this.materials);
        (this.materials.filter((mat) => !(this.materialMap.get(mesh.name)?.includes(mat)))).forEach(element => {
            console.log(element);
            element.opacity = 0;
        });
    }

    private animate = (time: number): void => {
        const delta = this.clock.getDelta();
        
        // Update the animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        this.tweens.forEach(tw => {
            tw.update(time);
        });

        if (this.cameraMoveTween != null) {
            this.cameraMoveTween.update(time);
        }
        
        this.composer.render();
        requestAnimationFrame(this.animate);
    };
}
