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

const GUITAR: string        = "Guitar"
const PLIMPOES: string      = "Plimpoes";
const TREE: string          = "Tree";
const IBN: string           = "IBN";
const CELESTE: string       = "Berry"
const TRACKFIELD: string    = "T&F"

const BACKGROUND: THREE.Color           = new THREE.Color(0x24273a);
const MODEL: string                     = "scene.glb"; 
const HIGHLIGHTS: Array<string>         = [GUITAR, PLIMPOES, TREE, IBN, CELESTE, TRACKFIELD];
const IDLE_ANIMATIONS: Array<string>    = ["TurnHead"];
const CAMERA_BASE: {
            pos: THREE.Vector3;
            rot: THREE.Vector3;
            zoom: number;
            grroty: number;
            sceneWidthFactor: number;
        }                               = {pos: new THREE.Vector3(0, 1.75, 3.5), rot: new THREE.Vector3(- Math.PI / 8, 0, 0), zoom: 1, grroty: Math.PI / 4, sceneWidthFactor: 1}
        // }                               = {pos: new THREE.Vector3(0, 0.5, 2), rot: new THREE.Vector3(- Math.PI / 8, 0, 0), zoom: 1, grroty: Math.PI / 4}

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
    private celestePass!: OutlinePass;
    private composer!: EffectComposer;
    private highlightObjects!: Array<number>;
    private animations!: Map<string, THREE.AnimationAction>;
    private mixer!: THREE.AnimationMixer;
    private clock: THREE.Clock;
    private tweens!: Array<Tween>;
    private cameraMoveTween: Tween | null = null;
    private cameraTweenStartTime: number = 0;
    private sceneWidthFactor: number = 1;

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

        // const axesHelper = new THREE.AxesHelper( 5 );
        // this.scene.add( axesHelper );

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.cameraGroup = new THREE.Group();
        this.cameraGroup.add(this.camera);
        this.scene.add(this.cameraGroup);

        this.camera.position.x = CAMERA_BASE.pos.x;
        this.camera.position.y = CAMERA_BASE.pos.y;
        this.camera.position.z = CAMERA_BASE.pos.z;

        this.camera.rotation.x = CAMERA_BASE.rot.x;
        this.cameraGroup.rotation.y = CAMERA_BASE.grroty
        
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
                    if (ch.name === "Berry") {
                        this.celestePass.selectedObjects.push(ch);
                    }
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
                console.log("ANIMATIONS")
                console.log(this.animations);
                const rest = this.animations.get("StandRest")!;
                console.log(rest);
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

                this.mainObject.rotation.y = 0;


                loading_screen.set_done().then(() => {
                    rest.play();
                    requestAnimationFrame(this.animate);
                    // Pop scene into play
                    let popinValues = {scale: 0, opacity: 0} // Start at nothing with no oppacity
                    const popinTween = new Tween(popinValues)
                        .to({scale: 1, opacity: 1}, 1000)
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
        this.outlinePass.edgeStrength = 5;
        this.outlinePass.edgeGlow = 1;
        this.outlinePass.edgeThickness = 1;
        this.outlinePass.pulsePeriod = 0;
        this.outlinePass.visibleEdgeColor.set('#ffffff');

        this.celestePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            this.scene,
            this.camera
        );
        this.celestePass.edgeStrength = 10;
        this.celestePass.edgeThickness = 5;
        this.celestePass.visibleEdgeColor.set('#000000');
        this.celestePass.hiddenEdgeColor.set('#000000');
        this.celestePass.edgeGlow = 0;
        this.celestePass.overlayMaterial.blending = THREE.NormalBlending;

        this.composer.addPass(this.outlinePass);
        this.composer.addPass(this.celestePass);


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


                this.cameraGroup.rotation.y = (1-(this.mouse.x / 4)) * (Math.PI / 4);
                
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

    private onWindowResize(): void {
        console.log("THISS")
        console.log(this);
        window.addEventListener('resize', this.resize_function.bind(this));
    }

    private resize_function(): void {
        this.camera.aspect = this.sceneWidthFactor * window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.sceneWidthFactor * window.innerWidth, window.innerHeight);
        
        // Update effect composer and outline pass size
        this.composer.setSize(this.sceneWidthFactor * window.innerWidth, window.innerHeight);
        this.outlinePass.resolution.set(this.sceneWidthFactor * window.innerWidth, window.innerHeight);
    }

    private onClick(): void {
        window.addEventListener('click', (e) => {
            if (this.outlinePass.selectedObjects.length > 0 && this.focussedObject == null) {
                e.preventDefault();
                let selected: THREE.Mesh = this.outlinePass.selectedObjects[0] as THREE.Mesh;
                this.focussedObject = selected;
                this.hideAllBut(selected);
                switch (selected.name) {
                    case GUITAR:
                        console.log(GUITAR);
                        this.moveCamera({pos: new THREE.Vector3(1.31928, 1.25, 1.25), rot: new THREE.Vector3(0, 0, 0), zoom: 1, grroty: 0, sceneWidthFactor: 0.5})
                        let widthObj = { factor: this.sceneWidthFactor };
                        let widthTween = new Tween(widthObj)
                            .to({ factor: 0.5 }, 1000)
                            .onUpdate(() => {
                                this.sceneWidthFactor = widthObj.factor;
                                this.canvas.style.width = widthObj.factor * window.innerWidth  + "px";
                                this.camera.aspect = widthObj.factor * window.innerWidth / window.innerHeight;
                            })
                            .start();
                        // this.tweens.push(widthTween);
                        console.log(this.canvas.style.left);
                        // this.canvas.style.left = (- window.innerWidth / 2) + "px";
                        console.log(this.canvas.style.left);
                        break;
                    case PLIMPOES:
                        console.log(PLIMPOES);
                        break;
                    case TREE:
                        console.log(TREE);
                        this.moveCamera({pos: new THREE.Vector3(0.8,1.05,1.4), rot: new THREE.Vector3(0, Math.PI / 2, 0), zoom: 1, grroty: 0, sceneWidthFactor: 1})  
                        break;
                    case IBN:
                        console.log(IBN);
                        this.moveCamera({pos: new THREE.Vector3(0.55, 1.2, 0.7), rot: new THREE.Vector3(0, Math.PI / 2, 0), zoom: 2, grroty: 0, sceneWidthFactor: 1})
                        break;
                    case CELESTE:
                        console.log(CELESTE)
                        this.moveCamera({pos: new THREE.Vector3(1, 1.7, 1.4), rot: new THREE.Vector3(0, Math.PI / 2, 0), zoom: 1, grroty: 0, sceneWidthFactor: 1})
                        break;
                    case TRACKFIELD:
                        console.log(TRACKFIELD)
                        this.moveCamera({pos: new THREE.Vector3(0.7, 1.7, 0.4), rot: new THREE.Vector3(0, Math.PI / 2, 0), zoom: 1, grroty: 0, sceneWidthFactor: 1})
                        break;
                }
            }
        })
        window.addEventListener('keydown', (e) => {
            if (e.key == "Escape" && !(this.focussedObject == null)) {
                this.hideAllBut(this.focussedObject, true)
                this.focussedObject = null;
                this.moveCamera(CAMERA_BASE)
            }
        })
    }

    private moveCamera(
        target: {
            pos: THREE.Vector3;
            rot: THREE.Vector3;
            zoom: number;
            grroty: number;
            sceneWidthFactor: number;
        }): void {

        console.log(target)

        // Calculate remaining time if tween is already running
        const time = this.cameraMoveTween == null ? 1000 : 1000 - (this.cameraMoveTween.getDuration() - (Date.now() - this.cameraTweenStartTime));
        
        this.cameraMoveTween = null;
        this.cameraTweenStartTime = Date.now();
        
        let cameraTranslation = {pos: this.camera.position, rot: this.camera.rotation, zoom: this.camera.zoom, grroty: this.cameraGroup.rotation.y, sceneWidthFactor: this.sceneWidthFactor}
        let tween = new Tween(cameraTranslation)
            .to(target, time)
            .onUpdate(() => {
                this.camera.zoom = cameraTranslation.zoom;
                this.cameraGroup.rotation.y = cameraTranslation.grroty;
                this.sceneWidthFactor = cameraTranslation.sceneWidthFactor;
                this.resize_function();
                this.camera.updateProjectionMatrix();
            })
            .onComplete(() => {
                this.cameraMoveTween = null;
            })
            .start();
        this.cameraMoveTween = tween;
    }

    private hideAllBut(mesh: THREE.Mesh, show: boolean = false): void {
        let materials = this.materials.filter((mat) => !(this.materialMap.get(mesh.name)?.includes(mat)));
        let opacity = {op: show ? 0 : 1};
        let hideTween = new Tween(opacity)
            .to({op: 1 - opacity.op}, 1000)
            .onUpdate(() => materials.forEach(element => {
                element.opacity = opacity.op;
            }))
            .delay(show ? 0 : 1000)
            .start();
        this.tweens.push(hideTween);
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
