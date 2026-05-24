precision highp float;

attribute vec3 position;
uniform mat4 world;
uniform mat4 worldViewProjection;

varying vec3 vWorldPos;
varying vec3 vCameraPos;

void main(void) {
    vec4 worldPos = world * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vCameraPos = world[3].xyz;
    gl_Position = worldViewProjection * worldPos;
}
