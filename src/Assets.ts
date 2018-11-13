import * as THREE from "three";

const lineGeometry = new THREE.BoxBufferGeometry(1, 1, 1);
export const assets = {
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

export type Assets = typeof assets;
