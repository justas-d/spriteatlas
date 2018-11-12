import {render} from "react-dom";
import * as React from "react";
import {RefObject} from "react";
import * as THREE from "three";
import {canvas} from "three/detector";
// @ts-ignore
import saveAs from 'save-as';

interface vec2 {
    x: number;
    y: number;
}

const TOOLS = {
    create: "Create",
    select: "Select",
};

export const rect_create_minMax = (a: vec2, b: vec2) => {
    const min = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
    };

    const max = {
        x: Math.max(a.x, b.x),
        y: Math.max(a.y, b.y),
    };

    return {min, max};
};

export const rect_scaleOrigin_to_minMax = (scale: vec2, origin: vec2) => {
    const corner1 = {
        x: origin.x - (scale.x / 2),
        y: origin.y - (scale.y / 2),
    };

    const corner2= {
        x: origin.x + (scale.x / 2),
        y: origin.y + (scale.y / 2),
    };

    return rect_create_minMax(corner1, corner2); // adjust in case scale had negative members
};


export const rect_minMax_to_scaleOrigin = ({min, max}: { min: vec2, max: vec2 }) => {
    const scale = {
        x: (max.x - min.x),
        y: (max.y - min.y),
    };

    const origin = {
        x: min.x + (scale.x / 2),
        y: min.y + (scale.y / 2),
    };

    return {scale, origin};
};

const v2_set_three = (obj: THREE.Vector3, vec: vec2) => {
    obj.x = vec.x;
    obj.y = vec.y;
};

type Opt<T> = T | undefined;

// TODO @ HACK
const createTextTexture = (txt: string) => {
    var canvas = document.createElement("canvas") as HTMLCanvasElement;
    canvas.height = 512;
    canvas.width = 512;

    var ctx = canvas.getContext("2d");
    if (!ctx) throw new Error();


    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "72px monospace";

    const x = canvas.width / 2;
    const y =canvas.height / 2;


    ctx.fillStyle = "#000000";
    ctx.fillText(txt, x ,y );

    ctx.strokeStyle = "#ffffff";
    ctx.strokeText(txt, x,y);

    const tex = new THREE.Texture(canvas);
    tex.needsUpdate = true;

    return tex;
};

interface IExportedQuad {
    center: vec2;
    name: string;
    pixelMin: vec2;
    pixelMax: vec2;
}

interface IQuad {
    quadName: string;
}

const setupCanvas = (canvas: HTMLCanvasElement, tellReactAboutSelectedQuad: (quad: Opt<IQuad>) => void) => {

    class TexQuad extends THREE.Object3D {
        public isTexQuad = true;

        private _meshArea: THREE.Mesh;
        private _meshOutline: THREE.LineSegments;
        private _textTexture!: THREE.Texture;
        private _spriteText: THREE.Sprite;

        private _quadName: string = "texture";

        public center: vec2 = {x: 0.5, y: 0.5};

        public constructor(private _min: vec2, private _max: vec2, private _assets: Assets, adjust: boolean = true) {
            super();

            this._meshArea = new THREE.Mesh(assets.boxGeometry, assets.fillMaterial);
            this._meshOutline = new THREE.LineSegments(assets.lineEdges, assets.lineMaterial);
            this._spriteText = new THREE.Sprite();

            this.genText();

            this.add(this._meshArea);
            this.add(this._meshOutline);
            this.add(this._spriteText);

            this._meshOutline.position.z = 2;

            this.updateMeshes(adjust);
        }

        private genText() {
            if(this._textTexture) {
                this._textTexture.dispose();
            }
            if(this._spriteText.material) {
                this._spriteText.material.dispose();
            }

            this._textTexture = createTextTexture(this._quadName);
            this._spriteText.material = new THREE.SpriteMaterial({map: this._textTexture});
        }

        public get quadName() {
            return this._quadName;
        }

        public set quadName(val: string) {
            if(val === this._quadName) return;
            this._quadName = val;

            this.genText();
        }

        public setSelected(isSelected: boolean) {
            if (isSelected) {
                this._meshArea.material = this._assets.fillMaterialSelected;
            } else {
                this._meshArea.material = this._assets.fillMaterial;
            }
        }

        private updateMeshes(adjust: boolean = true) {
            const combo = rect_create_minMax(this._max, this._min);
            this._min = combo.min;
            this._max = combo.max;

            const {scale, origin} = rect_minMax_to_scaleOrigin(combo);

            if(adjust) {
                scale.x += 1;
                scale.y += 1;
            }

            v2_set_three(this.position, origin);
            v2_set_three(this.scale, scale);
        }

        public setPoints(a: vec2, b: vec2) {
            this._min = a;
            this._max = b;
            this.updateMeshes();
        }

        public raycast(raycaster: any, intersects: any) {
            this._meshArea.raycast(raycaster, intersects);
        }
    }

    class TransformGizmo extends THREE.Object3D {

        private static readonly MODE_TRANSFORM = 0;
        private static readonly MODE_SCALE = 1;

        private _mode = TransformGizmo.MODE_SCALE;

        private _obj: Opt<TexQuad>;

        private _scaleQuadTop: THREE.Mesh;
        private _scaleQuadBottom: THREE.Mesh;
        private _scaleQuadLeft: THREE.Mesh;
        private _scaleQuadRight: THREE.Mesh;

        private _transformPlane: THREE.Mesh;
        private _transformX: THREE.Mesh;
        private _transformY: THREE.Mesh;

        private _centerGroup: THREE.Group;
        private _gizmoGroup : THREE.Group;

        private _centerMesh: THREE.Mesh;
        private _centerMeshOutline: THREE.LineSegments;

        private _dragStart: Opt<vec2>;
        private _barrierVec: vec2 = {x: 0, y: 0};

        public constructor(private _assets: Assets) {
            super();

            this._scaleQuadBottom = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoMaterial);
            this._scaleQuadLeft = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoMaterial);
            this._scaleQuadTop = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoMaterial);
            this._scaleQuadRight = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoMaterial);

            this._transformPlane = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoTransfromPlaneMaterial);
            this._transformX = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoTransformXMaterial);
            this._transformY = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoTransformYMaterial);

            this._centerMesh = new THREE.Mesh(this._assets.boxGeometry, this._assets.gizmoCenterMaterial);
            this._centerMeshOutline = new THREE.LineSegments(this._assets.lineEdges, this._assets.lineMaterial);

            this._centerGroup = new THREE.Group();
            this._centerGroup.add(this._centerMeshOutline, this._centerMesh);

            this._gizmoGroup = new THREE.Group();
            this._gizmoGroup.add(
                this._scaleQuadTop, this._scaleQuadBottom,
                this._scaleQuadLeft, this._scaleQuadRight,
                this._transformPlane, this._transformX,
                this._transformY
            );

            this.position.z = 1;

            window.addEventListener("mousemove", (e) => {
                if (!this._obj) {
                    document.body.style.cursor = "default";
                    return;
                }

                const pos = canvasToHomogeneous(e.x, e.y);
                raycaster.setFromCamera(pos, camera);
                const hits = raycaster.intersectObjects(this._gizmoGroup.children);

                if (!this._dragStart) {
                    this._barrierVec.x = 0;
                    this._barrierVec.y = 0;

                    for (const hit of hits) {
                        if (hit.object === this._scaleQuadBottom) {
                            this._barrierVec.x = 0;
                            this._barrierVec.y = -1;
                            this._mode = TransformGizmo.MODE_SCALE;
                            break;

                        } else if (hit.object === this._scaleQuadLeft) {
                            this._barrierVec.x = -1;
                            this._barrierVec.y = 0;
                            this._mode = TransformGizmo.MODE_SCALE;
                            break;

                        } else if (hit.object === this._scaleQuadTop) {
                            this._barrierVec.x = 0;
                            this._barrierVec.y = 1;
                            this._mode = TransformGizmo.MODE_SCALE;
                            break;

                        } else if (hit.object === this._scaleQuadRight) {
                            this._barrierVec.x = 1;
                            this._barrierVec.y = 0;
                            this._mode = TransformGizmo.MODE_SCALE;
                            break;

                        } else if (hit.object === this._transformPlane) {
                            this._barrierVec.x = 1;
                            this._barrierVec.y = 1;
                            this._mode = TransformGizmo.MODE_TRANSFORM;
                            break;

                        } else if (hit.object === this._transformX) {
                            this._barrierVec.x = 1;
                            this._barrierVec.y = 0;
                            this._mode = TransformGizmo.MODE_TRANSFORM;
                            break;

                        } else if (hit.object === this._transformY) {
                            this._barrierVec.x = 0;
                            this._barrierVec.y = 1;
                            this._mode = TransformGizmo.MODE_TRANSFORM;
                            break;
                        }
                    }
                } else if (this._dragStart) {
                    const world = worldToPixel(canvasToWorld(e.x, e.y));

                    let delta = {
                        x: (world.x - this._dragStart.x),
                        y: (world.y - this._dragStart.y),
                    };

                    delta.x *= this._barrierVec.x;
                    delta.y *= this._barrierVec.y;

                    if (delta.x || delta.y) {
                        this._dragStart = world;

                        if (this._mode === TransformGizmo.MODE_SCALE) {

                            this._obj.scale.x += delta.x;
                            this._obj.scale.y += delta.y;

                            this._obj.position.x += this._barrierVec.x * 0.5 * delta.x;
                            this._obj.position.y += this._barrierVec.y * 0.5 * delta.y;

                        } else if (this._mode === TransformGizmo.MODE_TRANSFORM) {
                            if(e.ctrlKey) {
                                delta.x /= this._obj.scale.x;
                                delta.y /= this._obj.scale.y;

                                this._obj.center.x += delta.x;
                                this._obj.center.y += delta.y;
                            } else {
                                this._obj.position.x += delta.x;
                                this._obj.position.y += delta.y;
                            }
                        }
                    }
                }

                document.body.style.cursor = (this._barrierVec.x !== 0 || this._barrierVec.y !== 0) ? "pointer" : "default";
            });

            window.addEventListener("mousedown", (e) => {
                if (!this._obj) return;

                if (e.button === 0 && (this._barrierVec.x || this._barrierVec.y)) {
                    this._dragStart = worldToPixel(canvasToWorld(e.x, e.y));
                }

            });

            window.addEventListener("mouseup", (e) => {
                if (!this._obj) return;

                if (e.button === 0) this._dragStart = undefined;

                this._barrierVec.x = 0;
                this._barrierVec.y = 0;
            });
        }

        public attach(obj: TexQuad) {
            this._obj = obj;
            this.add(this._centerGroup, this._gizmoGroup);
            this.update();
        }

        public update() {
            if (this._obj) {
                this.position.x = this._obj.position.x;
                this.position.y = this._obj.position.y;

                const scaleX = {
                    x: this._obj.scale.x,
                    y: 16 / camera.zoom
                };

                const scaleY = {
                    x: 16 / camera.zoom,
                    y: this._obj.scale.y,
                };

                v2_set_three(this._scaleQuadBottom.scale, scaleX);
                v2_set_three(this._scaleQuadTop.scale, scaleX);

                v2_set_three(this._scaleQuadLeft.scale, scaleY);
                v2_set_three(this._scaleQuadRight.scale, scaleY);

                this._scaleQuadBottom.position.y = -this._obj.scale.y / 2;
                this._scaleQuadTop.position.y = this._obj.scale.y / 2;
                this._scaleQuadRight.position.x = this._obj.scale.x / 2;
                this._scaleQuadLeft.position.x = -this._obj.scale.x / 2;


                const plane = Math.min(this._obj.scale.x, this._obj.scale.y) * 0.25;
                const arrows = Math.max(this._obj.scale.x, this._obj.scale.y) * 1.1;

                this._transformPlane.scale.x = plane;
                this._transformPlane.scale.y = plane;

                this._transformX.scale.x = arrows;
                this._transformX.scale.y = plane / camera.zoom;

                this._transformY.scale.y = arrows;
                this._transformY.scale.x = plane / camera.zoom;

                this._centerGroup.position.x = -this._obj.scale.x / 2 + 0.5;
                this._centerGroup.position.y = -this._obj.scale.y / 2 + 0.5;

                this._centerMesh.position.x = this._centerMeshOutline.position.x = this._obj.scale.x * this._obj.center.x;
                this._centerMesh.position.y = this._centerMeshOutline.position.y = this._obj.scale.y * this._obj.center.y;

                this._centerMeshOutline.scale.y = this._centerMeshOutline.scale.x = plane * 0.5;
            }
        }

        public get object() {
            return this._obj;
        }

        public detach() {
            this._obj = undefined;
            this.remove(this._centerGroup, this._gizmoGroup);
        }
    }

    const isTexQuad = (obj: any): obj is TexQuad => {
        return obj && (obj as TexQuad).isTexQuad;
    };

    const renderer = new THREE.WebGLRenderer({canvas: canvas});
    const camera = new THREE.OrthographicCamera(0, 0, 0, 0, -10, 10);
    camera.position.z = 5;
    const scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();

    {
        const axis = new THREE.AxesHelper(1000);
        axis.scale.y *= -1;
        scene.add(axis);
    }


    let tool = TOOLS.create;

    const setSize = (x: number, y: number) => {
        camera.left = 0;
        camera.right = x;
        camera.bottom = -y;
        camera.top = 0;

        renderer.setViewport(0, 0, x, y);
        renderer.setSize(x, y, true);

        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
    };

    window.addEventListener("resize", (e) => {
        setSize(window.innerWidth, window.innerHeight);
    });

    setSize(window.innerWidth, window.innerHeight);

    renderer.setClearColor(0xc9c9c9);

    const render = () => {
        camera.updateProjectionMatrix();

        control.update();
        renderer.render(scene, camera);

        requestAnimationFrame(render);
    };


    const texQuads: TexQuad[] = [];
    let currentTexQuad: Opt<TexQuad>;

    const canvasToHomogeneous = (x: number, y: number) => {
        const bb = canvas.getBoundingClientRect();
        return {
            x: (x / bb.width * 2) - 1,
            y: -((y / bb.height * 2) - 1),
        };
    };

    const canvasToWorld = (x: number, y: number) => {
        const homogeneous = canvasToHomogeneous(x, y);

        const world = new THREE.Vector3(homogeneous.x, homogeneous.y).unproject(camera);
        homogeneous.x = world.x;
        homogeneous.y = world.y;
        return homogeneous;
    };

    const worldToPixel = (vec: vec2) => {
        return {
            x: Math.round(vec.x - 0.5) + 0.5,
            y: Math.round(vec.y - 0.5) + 0.5,
        };
    };

    const raycaster = new THREE.Raycaster();

    const lineGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
    const assets = {
        cornerMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0x35defc,
            opacity: 0,
            transparent: true
        }),
        cornerMaterialSelected: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0x35defc,
            opacity: 0.5,
            transparent: true
        }),

        fillMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xbae8a9,
            opacity: 0.1,
            transparent: true
        }),
        fillMaterialSelected: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xbae8a9,
            opacity: 0.1,
            transparent: true
        }),

        cursorMaterial: new THREE.MeshBasicMaterial({
            color: 0xf4428c,
            opacity: 0.7,
            transparent: true
        }),

        gizmoTransfromPlaneMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xddbe80,
            opacity: 0.2,
            transparent: true
        }),

        gizmoTransformXMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xff0000,
            opacity: 0.4,
            transparent: true
        }),

        gizmoTransformYMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0x00ff00,
            opacity: 0.4,
            transparent: true
        }),

        gizmoCenterMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xf4e242,
            opacity: 0.8,
            transparent: true
        }),

        gizmoMaterial: new THREE.MeshBasicMaterial({
            side: THREE.BackSide,
            color: 0xa142f4,
            opacity: 0.15,
            transparent: true
        }),

        circleGeometry: new THREE.CircleGeometry(1, 32),

        lineMaterial: new THREE.LineBasicMaterial({color: 0x000000}),

        boxGeometry: new THREE.BoxGeometry(1, 1, 1),
        lineEdges: new THREE.EdgesGeometry(lineGeometry),
    };

    const cursorMesh = new THREE.Mesh(assets.boxGeometry, assets.cursorMaterial);
    scene.add(cursorMesh);


    const sprite = new THREE.Sprite();
    sprite.center.x = 0;
    sprite.center.y = 1;
    scene.add(sprite);

    const spriteOutline = new THREE.LineSegments(assets.lineEdges, assets.lineMaterial);
    spriteOutline.position.z = sprite.position.z = -1;
    scene.add(spriteOutline);

    type Assets = typeof assets;

    const control = new TransformGizmo(assets);
    scene.add(control);

    const createTexQuad = (a: vec2, b: vec2, adjust: boolean = true) => {
        const tex = new TexQuad(a, b, assets, adjust);
        scene.add(tex);
        texQuads.push(tex);
        return tex;
    };

    const importQuads = (quads: IExportedQuad[]) => {
        let shouldDoIt: boolean = true;
        if(texQuads.length > 0) {
            shouldDoIt = confirm("Overwrite?");
        }

        if(!shouldDoIt) {
            return;
        }

        while(texQuads.length) {
            deleteTexQuad(texQuads[0]);
        }

        for(const quad of quads) {
            const tex = createTexQuad(quad.pixelMin, quad.pixelMax, false);
            console.log(tex);
            tex.center = quad.center;
            tex.quadName = quad.name;
        }
    };

    const exportQuads = () => {
        const mappedQuads: IExportedQuad[] = texQuads.map(t => {

            const worldPos = rect_scaleOrigin_to_minMax(t.scale, t.position);

            return {
                center: t.center,
                name: t.quadName,
                pixelMin: worldPos.min,
                pixelMax: worldPos.max
            }
        });

        return JSON.stringify(mappedQuads, null, 4);
    };

    const deleteTexQuad = (quad: TexQuad) => {
        const idx = texQuads.findIndex(q => q === quad);
        if (idx !== -1) {
            texQuads.splice(idx, 1);
        }

        scene.remove(quad);
    };

    const setSelected = (quad: Opt<TexQuad>) => {
        if (currentTexQuad) {
            currentTexQuad.setSelected(false);

        }

        if (quad) {
            quad.setSelected(true);
            if (tool === TOOLS.select) {
                control.attach(quad);
            }
        }

        tellReactAboutSelectedQuad(quad);
        currentTexQuad = quad;
    };

    {
        let camDragStart: Opt<vec2>;
        let pixelDragStart: Opt<vec2>;

        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();

            if (key === "s") {
                setTool("select");
            } else if (key === "c") {
                setTool("create");
            }

            switch (tool) {
                case TOOLS.select: {
                    if (e.key === "Delete" && currentTexQuad) {
                        deleteTexQuad(currentTexQuad);

                        if (control.object === currentTexQuad) {
                            control.detach();
                        }

                        currentTexQuad = undefined;
                    }
                    break;
                }
            }
        });

        window.addEventListener("mousedown", (e) => {
            if (e.target !== canvas) return;

            switch (e.button) {
                case 1: {

                    camDragStart = canvasToWorld(e.x, e.y);
                    break;
                }
                case 0: {
                    switch (tool) {
                        case TOOLS.create: {
                            setSelected(undefined);
                            pixelDragStart = worldToPixel(canvasToWorld(e.x, e.y));
                            break;
                        }
                    }

                    break;
                }
            }
        });

        window.addEventListener("mouseup", (e) => {
            if (e.target !== canvas) return;

            switch (e.button) {
                case 1: {
                    camDragStart = undefined;
                    break;
                }
                case 0: {
                    switch (tool) {
                        case TOOLS.create: {
                            pixelDragStart = undefined;
                            break;
                        }
                        case TOOLS.select: {
                            const pos = canvasToHomogeneous(e.x, e.y);
                            raycaster.setFromCamera(pos, camera);
                            const intersects = raycaster.intersectObjects(scene.children);

                            for (const hit of intersects) {
                                if (isTexQuad(hit.object.parent)) {
                                    setSelected(hit.object.parent);
                                    break;
                                }
                            }

                            break;
                        }
                    }
                    break;
                }
            }
        });
        window.addEventListener("wheel", (e: MouseWheelEvent) => {
            camera.zoom += camera.zoom * 0.05 * e.deltaY;
            camera.updateProjectionMatrix();
        });

        window.addEventListener("mousemove", (e: MouseEvent) => {
            const world = canvasToWorld(e.x, e.y);
            const pixel = worldToPixel(world);

            if (camDragStart) {


                camera.position.x += camDragStart.x - world.x;
                camera.position.y += camDragStart.y - world.y;
            }

            if (pixelDragStart) {
                if (!currentTexQuad) {
                    const quad = createTexQuad(pixel, pixelDragStart);
                    setSelected(quad);
                }
                if (!currentTexQuad) return;

                currentTexQuad.setPoints(pixel, pixelDragStart);
            }

            v2_set_three(cursorMesh.position, pixel);
        });

    }

    const setNewSpriteSheet = async (sheetUrl: string) => {
        let tex: THREE.Texture | undefined;
        try {
            tex = await (new Promise<THREE.Texture>((ok, err) => loader.load(sheetUrl, ok, undefined, err)));
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
        } catch (e) {
            console.error(e);
            alert(e);
        }

        if (!tex) return;

        if (sprite.material) {
            sprite.material.dispose();
        }

        sprite.material = new THREE.SpriteMaterial({map: tex});

        spriteOutline.scale.x = sprite.scale.x = tex.image.width;
        spriteOutline.scale.y = sprite.scale.y = tex.image.height;

        spriteOutline.position.x = spriteOutline.scale.x / 2;
        spriteOutline.position.y = -spriteOutline.scale.y / 2;
    };

    requestAnimationFrame(render);

    const setTool = (key: string) => {
        tool = TOOLS[key];

        switch (tool) {
            case TOOLS.select: {
                if (currentTexQuad) {
                    control.attach(currentTexQuad);
                    cursorMesh.visible = false;
                }
                break;
            }
            case TOOLS.create: {
                control.detach();
                cursorMesh.visible = true;
            }
        }
    };

    return {
        setSprite: setNewSpriteSheet,
        setTool,
        exportQuads,
        importQuads,
    };
};

class Page extends React.Component<{}, {quad: Opt<IQuad>}> {
    private _canvasRef: RefObject<HTMLCanvasElement> = React.createRef();
    private _prevImgUrl: string | undefined;
    private _setNewSpriteSheet: ((sheetUrl: string) => void) | undefined;
    private _setTool: ((toolKey: string) => void) | undefined;
    private _exportQuads: (() => string) | undefined;
    private _importQuads: ((quads: IExportedQuad[]) => void) | undefined;

    componentDidMount() {
        const canvas = this._canvasRef.current;
        if (!canvas) {
            alert("Couldn't find canvas!");
            return;
        }

        console.log("setting up!");
        const {setSprite, setTool, exportQuads, importQuads} = setupCanvas(canvas, this.onChangeQuad);
        this._setNewSpriteSheet = setSprite;
        this._setTool = setTool;
        this._exportQuads = exportQuads;
        this._importQuads = importQuads;
    }

    onChangeQuad = (quad: Opt<IQuad>) => {
        this.setState({quad: quad});
    };

    onChangeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const file = e.target.files[0];

        if (this._prevImgUrl) {
            URL.revokeObjectURL(this._prevImgUrl);
        }

        const imgUrl = URL.createObjectURL(file);
        this._prevImgUrl = imgUrl;

        if (this._setNewSpriteSheet) {
            this._setNewSpriteSheet(imgUrl);
        }
    };

    onImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;

        const file = e.target.files[0];

        const reader = new FileReader();
        reader.onload = (f) => {
            if(typeof reader.result !== "string") return;

            try {
                const quads: IExportedQuad[] = JSON.parse(reader.result);
                if(!this._importQuads)return;
                this._importQuads(quads);
            } catch(err) {
                console.error(err);
                alert(err);

            }
        };

        reader.readAsText(file);
    };

    onExport = () => {
        if(!this._exportQuads) return;
        const str = this._exportQuads();

        let blob = new Blob([str], {type: "application/json"});
        saveAs(blob, "spritesheet.json");
    };

    render() {
        const quad = this.state ? this.state.quad : undefined;

        let quadWidget: any = null;

        const InputWidget = ({type, getter, setter}: any) => {
            if(!quad) return <></>;

            const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                if(quad) setter(e.target.value);
            };

            return <input type={type} defaultValue={getter()} onChange={onChange}/>
        };

        if(quad) {

            quadWidget = (
                <div style={{position: "absolute", right: "16px", top: "16px"}}>
                    <InputWidget type="text" getter={() => quad.quadName} setter={(val: string) => quad.quadName =val}/>
                </div>
            )
        }

        const toolOptions = [];
        for (const key in TOOLS) {
            const str = TOOLS[key];

            toolOptions.push(<option key={key} value={key}>{str}</option>);
        }

        return (
            <div style={{position: "relative", overflow: "hidden", height: "100vh", width: "100%"}}>
                <canvas ref={this._canvasRef}/>

                <div style={{position: "absolute", top: "16px", left: "16px"}}>
                    <span>Image:</span>
                    <input type="file" onChange={this.onChangeFile}/>

                    <span>Atlas:</span>
                    <input type="file" onChange={this.onImport}/>

                    <input type="button" onClick={this.onExport} value="Export"/>
                </div>

                {quadWidget}
            </div>

        )
    }
}

render(<Page/>, document.getElementById("root"));

