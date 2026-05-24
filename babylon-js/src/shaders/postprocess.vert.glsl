precision highp float;

attribute vec2 position;
varying vec2 vUV;

uniform float uTime;

void main() {
    vec2 uv = (position + 1.0) * 0.5;
    vec2 warp = vec2(
        sin(uv.y * 4.0 + uTime * 3.0) * 0.15,
        cos(uv.x * 4.0 + uTime * 2.0) * 0.15
    );

    gl_Position = vec4(position + warp, 0.0, 1.0);
    vUV = uv;
}
