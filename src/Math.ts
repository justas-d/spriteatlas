import * as THREE from "three";

export interface vec2 {
    x: number;
    y: number;
}

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

export const v2_set_three = (obj: THREE.Vector3, vec: vec2) => {
    obj.x = vec.x;
    obj.y = vec.y;
};
