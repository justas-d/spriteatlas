import * as THREE from "three";
import {Assets} from "./Assets";
import {TexQuad} from "./TexQuad";
import {v2_set_three, vec2} from "./Math";
import {App} from "./App";
import {Opt} from "./TypescriptUtils";

export class TransformGizmo extends THREE.Object3D {

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
    private _gizmoGroup: THREE.Group;

    private _centerMesh: THREE.Mesh;
    private _centerMeshOutline: THREE.LineSegments;

    private _dragStart: Opt<vec2>;
    private _barrierVec: vec2 = {x: 0, y: 0};

    public constructor(private _assets: Assets, private _app: App) {
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

            const pos = this._app.canvasToHomogeneous(e.x, e.y);
            this._app.raycaster.setFromCamera(pos, this._app.camera);
            const hits = this._app.raycaster.intersectObjects(this._gizmoGroup.children);

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
                const world = this._app.worldToPixel(this._app.canvasToWorld(e.x, e.y));

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
                        if (e.ctrlKey) {
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
                this._dragStart = this._app.worldToPixel(this._app.canvasToWorld(e.x, e.y));
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
                y: 16 / this._app.camera.zoom
            };

            const scaleY = {
                x: 16 / this._app.camera.zoom,
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
            this._transformX.scale.y = plane / this._app.camera.zoom;

            this._transformY.scale.y = arrows;
            this._transformY.scale.x = plane / this._app.camera.zoom;

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
