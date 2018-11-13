import * as THREE from "three";

export const createTextTexture = (txt: string) => {
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
