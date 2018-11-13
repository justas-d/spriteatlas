import * as THREE from "three";
import {IExportedQuad, IQuad, isTexQuad, TexQuad} from "./TexQuad";
import {TransformGizmo} from "./TransformGizmo";
import {rect_scaleOrigin_to_minMax, v2_set_three, vec2} from "./Math";
import {assets} from "./Assets";
import {Opt} from "./TypescriptUtils";

const TOOLS = {
    create: "Create",
    select: "Select",
};

export class App {
    private renderer: THREE.WebGLRenderer;
    public camera = new THREE.OrthographicCamera(0, 0, 0, 0, -10, 10);

    private scene = new THREE.Scene();
    private loader = new THREE.TextureLoader();

    private tool = TOOLS.create;

    private texQuads: TexQuad[] = [];
    private currentTexQuad: Opt<TexQuad>;

    public raycaster = new THREE.Raycaster();

    private cursorMesh: THREE.Mesh;
    private sprite: THREE.Sprite;
    private spriteOutline: THREE.LineSegments;

    private control: TransformGizmo;

    private camDragStart: Opt<vec2>;
    private pixelDragStart: Opt<vec2>;

    public constructor(private canvas: HTMLCanvasElement, private _changeQuadCallback: (quad: Opt<IQuad>) => void) {
        this.renderer = new THREE.WebGLRenderer({canvas: canvas});
        this.camera.position.z = 5;

        const axis = new THREE.AxesHelper(1000);
        axis.scale.y *= -1;
        this.scene.add(axis);

        this.cursorMesh = new THREE.Mesh(assets.boxGeometry, assets.cursorMaterial);
        this.scene.add(this.cursorMesh);

        this.sprite = new THREE.Sprite();
        this.sprite.center.x = 0;
        this.sprite.center.y = 1;
        this.scene.add(this.sprite);

        this.spriteOutline = new THREE.LineSegments(assets.lineEdges, assets.lineMaterial);
        this.spriteOutline.position.z = this.sprite.position.z = -1;
        this.scene.add(this.spriteOutline);

        this.control = new TransformGizmo(assets, this);
        this.scene.add(this.control);

        this.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xc9c9c9);

        this.render();

        window.addEventListener("resize", (e) => {
            this.setSize(window.innerWidth, window.innerHeight);
        });

        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();

            if (key === "s") {
                this.setTool("select");
            } else if (key === "c") {
                this.setTool("create");
            }

            switch (this.tool) {
                case TOOLS.select: {
                    if (e.key === "Delete" && this.currentTexQuad) {
                        this.deleteTexQuad(this.currentTexQuad);

                        if (this.control.object === this.currentTexQuad) {
                            this.control.detach();
                        }

                        this.currentTexQuad = undefined;
                    }
                    break;
                }
            }
        });

        window.addEventListener("mousedown", (e) => {
            if (e.target !== canvas) return;

            switch (e.button) {
                case 1: {

                    this.camDragStart = this.canvasToWorld(e.x, e.y);
                    break;
                }
                case 0: {
                    switch (this.tool) {
                        case TOOLS.create: {
                            this.setSelected(undefined);
                            this.pixelDragStart = this.worldToPixel(this.canvasToWorld(e.x, e.y));
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
                    this.camDragStart = undefined;
                    break;
                }
                case 0: {
                    switch (this.tool) {
                        case TOOLS.create: {
                            this.pixelDragStart = undefined;
                            break;
                        }
                        case TOOLS.select: {
                            const pos = this.canvasToHomogeneous(e.x, e.y);
                            this.raycaster.setFromCamera(pos, this.camera);
                            const intersects = this.raycaster.intersectObjects(this.scene.children);

                            for (const hit of intersects) {
                                if (isTexQuad(hit.object.parent)) {
                                    this.setSelected(hit.object.parent);
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
            this.camera.zoom += this.camera.zoom * 0.05 * e.deltaY;
            this.camera.updateProjectionMatrix();
        });

        window.addEventListener("mousemove", (e: MouseEvent) => {
            const world = this.canvasToWorld(e.x, e.y);
            const pixel = this.worldToPixel(world);

            if (this.camDragStart) {


                this.camera.position.x += this.camDragStart.x - world.x;
                this.camera.position.y += this.camDragStart.y - world.y;
            }

            if (this.pixelDragStart) {
                if (!this.currentTexQuad) {
                    const quad = this.createTexQuad(pixel, this.pixelDragStart);
                    this.setSelected(quad);
                }
                if (!this.currentTexQuad) return;

                this.currentTexQuad.setPoints(pixel, this.pixelDragStart);
            }

            v2_set_three(this.cursorMesh.position, pixel);
        });
    }

    private render = () => {
        this.camera.updateProjectionMatrix();

        this.control.update();
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(this.render);
    };

    private setSize = (x: number, y: number) => {
        this.camera.left = 0;
        this.camera.right = x;
        this.camera.bottom = -y;
        this.camera.top = 0;

        this.renderer.setViewport(0, 0, x, y);
        this.renderer.setSize(x, y, true);

        this.camera.updateProjectionMatrix();
        this.camera.updateMatrixWorld(true);
    };

    public canvasToHomogeneous(x: number, y: number) {
        const bb = this.canvas.getBoundingClientRect();
        return {
            x: (x / bb.width * 2) - 1,
            y: -((y / bb.height * 2) - 1),
        };
    };

    public canvasToWorld(x: number, y: number) {
        const homogeneous = this.canvasToHomogeneous(x, y);

        const world = new THREE.Vector3(homogeneous.x, homogeneous.y).unproject(this.camera);
        homogeneous.x = world.x;
        homogeneous.y = world.y;
        return homogeneous;
    };

    public worldToPixel (vec: vec2) {
        return {
            x: Math.round(vec.x - 0.5) + 0.5,
            y: Math.round(vec.y - 0.5) + 0.5,
        };
    };

    private createTexQuad(a: vec2, b: vec2, adjust: boolean = true) {
        const tex = new TexQuad(a, b, assets, adjust);
        this.scene.add(tex);
        this.texQuads.push(tex);
        return tex;
    };

    public importQuads(quads: IExportedQuad[]) {
        let shouldDoIt: boolean = true;
        if(this.texQuads.length > 0) {
            shouldDoIt = confirm("Overwrite?");
        }

        if(!shouldDoIt) {
            return;
        }

        while(this.texQuads.length) {
            this.deleteTexQuad(this.texQuads[0]);
        }

        for(const quad of quads) {
            const tex = this.createTexQuad(quad.pixelMin, quad.pixelMax, false);
            console.log(tex);
            tex.center = quad.center;
            tex.quadName = quad.name;
        }
    };

    public exportQuads() {
        const mappedQuads: IExportedQuad[] = this.texQuads.map(t => {

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

    private deleteTexQuad(quad: TexQuad) {
        const idx = this.texQuads.findIndex(q => q === quad);
        if (idx !== -1) {
            this.texQuads.splice(idx, 1);
        }

        this.scene.remove(quad);
    };

    private setSelected(quad: Opt<TexQuad>) {
        if (this.currentTexQuad) {
            this.currentTexQuad.setSelected(false);

        }

        if (quad) {
            quad.setSelected(true);
            if (this.tool === TOOLS.select) {
                this.control.attach(quad);
            }
        }

        this._changeQuadCallback(quad);
        this.currentTexQuad = quad;
    };

    public setNewSpriteSheet = async (sheetUrl: string) => {
        let tex: THREE.Texture | undefined;
        try {
            tex = await (new Promise<THREE.Texture>((ok, err) => this.loader.load(sheetUrl, ok, undefined, err)));
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
        } catch (e) {
            console.error(e);
            alert(e);
        }

        if (!tex) return;

        if (this.sprite.material) {
            this.sprite.material.dispose();
        }

        this.sprite.material = new THREE.SpriteMaterial({map: tex});

        this.spriteOutline.scale.x = this.sprite.scale.x = tex.image.width;
        this.spriteOutline.scale.y = this.sprite.scale.y = tex.image.height;

        this.spriteOutline.position.x = this.spriteOutline.scale.x / 2;
        this.spriteOutline.position.y = -this.spriteOutline.scale.y / 2;
    };

    public setTool(key: string) {
        this.tool = TOOLS[key];

        switch (this.tool) {
            case TOOLS.select: {
                if (this.currentTexQuad) {
                    this.control.attach(this.currentTexQuad);
                    this.cursorMesh.visible = false;
                }
                break;
            }
            case TOOLS.create: {
                this.control.detach();
                this.cursorMesh.visible = true;
            }
        }
    };
}
