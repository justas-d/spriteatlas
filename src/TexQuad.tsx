import * as THREE from "three";
import {rect_create_minMax, rect_minMax_to_scaleOrigin, v2_set_three, vec2} from "./Math";
import {Assets, assets} from "./Assets";
import {createTextTexture} from "./GLUtils";

export interface IExportedQuad {
    center: vec2;
    name: string;
    pixelMin: vec2;
    pixelMax: vec2;
}

export interface IQuad {
    quadName: string;
    scale: vec2;
    position: vec2;
}

export const isTexQuad = (obj: any): obj is TexQuad => {
    return obj && (obj as TexQuad).isTexQuad;
};

export class TexQuad extends THREE.Object3D {
    public isTexQuad = true;

    private _meshArea: THREE.Mesh;
    private _meshOutline: THREE.LineSegments;
    private _textTexture!: THREE.Texture;
    private _spriteText: THREE.Sprite;

    private _quadName: string = "texture";

    public center: vec2 = {x: 0.5, y: 0.5};

    public get max() {
        return this._max;
    }

    public get min() {
        return this._min;
    }

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
        if (this._textTexture) {
            this._textTexture.dispose();
        }
        if (this._spriteText.material) {
            this._spriteText.material.dispose();
        }

        this._textTexture = createTextTexture(this._quadName);
        this._spriteText.material = new THREE.SpriteMaterial({map: this._textTexture});
    }

    public get quadName() {
        return this._quadName;
    }

    public set quadName(val: string) {
        if (val === this._quadName) return;
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

        if (adjust) {
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
