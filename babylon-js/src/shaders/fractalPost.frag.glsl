precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D envSampler;
uniform float     uEnvMapAvailable;

uniform float uTime;
uniform float uSpikiness;
uniform float uThickness;
uniform float uScale;
uniform vec3  uColor;
uniform float uWeirdness;

uniform vec3 uCameraPos;
uniform mat4 uInverseViewProj;
uniform float uKick;
uniform float uBass;
uniform float uTreble;
uniform float uHighTone;
uniform float uFilterType;  // -1=highpass, 0=none, 1=lowpass
#define Iterations 32
#define PI 3.14159265359

// =========================================================================
// Truchet distance functions
// =========================================================================

float rand(vec3 r) {
    return fract(sin(dot(r.xy, vec2(1.38945 * sin(r.z), 1.13233 * cos(r.z)))) * 653758.5453);
}

float truchetarc(vec3 pos, float thickness, float superQuadPower) {
    float r = length(pos.xy);
    return pow(
        pow(abs(r - 0.5), superQuadPower) + pow(abs(pos.z - 0.5), superQuadPower),
        1.0 / superQuadPower
    ) - thickness;
}

float truchetcell(vec3 pos, float thickness, float superQuadPower) {
    return min(min(
        truchetarc(pos, thickness, superQuadPower),
        truchetarc(vec3(pos.z, 1.0 - pos.x, pos.y), thickness, superQuadPower)),
        truchetarc(vec3(1.0 - pos.y, 1.0 - pos.z, pos.x), thickness, superQuadPower));
}

float distfunc(vec3 pos, float thickness, float superQuadPower) {
    vec3 cellpos = fract(pos);
    vec3 gridpos = floor(pos);
    float rnd = rand(gridpos);

    if (rnd < 1.0 / 8.0) return truchetcell(vec3(cellpos.x, cellpos.y, cellpos.z), thickness, superQuadPower);
    else if (rnd < 2.0 / 8.0) return truchetcell(vec3(cellpos.x, 1.0 - cellpos.y, cellpos.z), thickness, superQuadPower);
    else if (rnd < 3.0 / 8.0) return truchetcell(vec3(1.0 - cellpos.x, cellpos.y, cellpos.z), thickness, superQuadPower);
    else if (rnd < 4.0 / 8.0) return truchetcell(vec3(1.0 - cellpos.x, 1.0 - cellpos.y, cellpos.z), thickness, superQuadPower);
    else if (rnd < 5.0 / 8.0) return truchetcell(vec3(cellpos.y, cellpos.x, 1.0 - cellpos.z), thickness, superQuadPower);
    else if (rnd < 6.0 / 8.0) return truchetcell(vec3(cellpos.y, 1.0 - cellpos.x, 1.0 - cellpos.z), thickness, superQuadPower);
    else if (rnd < 7.0 / 8.0) return truchetcell(vec3(1.0 - cellpos.y, cellpos.x, 1.0 - cellpos.z), thickness, superQuadPower);
    else return truchetcell(vec3(1.0 - cellpos.y, 1.0 - cellpos.x, 1.0 - cellpos.z), thickness, superQuadPower);
}

vec3 gradient(vec3 pos, float thickness, float superQuadPower) {
    const float eps = 0.0001;
    float mid = distfunc(pos, thickness, superQuadPower);
    return vec3(
        distfunc(pos + vec3(eps, 0.0, 0.0), thickness, superQuadPower) - mid,
        distfunc(pos + vec3(0.0, eps, 0.0), thickness, superQuadPower) - mid,
        distfunc(pos + vec3(0.0, 0.0, eps), thickness, superQuadPower) - mid
    );
}

// =========================================================================
// Environment
// =========================================================================

vec3 proceduralEnv(vec3 dir) {
    float t = dir.y * 0.5 + 0.5;
    return mix(vec3(0.02, 0.02, 0.06), vec3(0.1, 0.05, 0.2), t);
}

vec2 envMapUV(vec3 dir) {
    float u = atan(dir.z, dir.x) / (2.0 * PI) + 0.5;
    float v = asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5;
    return vec2(u, v);
}

vec3 sampleEnv(vec3 dir) {
    if (uEnvMapAvailable < 0.5) return proceduralEnv(dir);
    return texture2D(envSampler, envMapUV(dir)).rgb;
}

// =========================================================================
// Main
// =========================================================================

void main(void) {
    // uTime oscillators for baseline animation (always moving)
    float tSlow  = sin(uTime * 0.7);
    float tMid   = sin(uTime * 1.3);
    float tFast  = sin(uTime * 2.5);

    // Audio + time modulated parameters
    float thickness      = mix(0.0, 0.3, clamp(uThickness + uTreble * 0.4 ,  0.0, 1.0));
    float superQuadPower = mix(1.0, 20.0, clamp(uSpikiness + uBass*uBass  * 0.7 , 0.0, 1.0));
    float scale          = uScale ;
    // Filter-driven color temperature shift
    vec3 colorMod = uColor;
    colorMod = mix(colorMod, vec3(1.0, 0.55, 0.15), max(0.0,  uFilterType) * uBass   * 1.0);
    colorMod = mix(colorMod, vec3(0.2,  0.55, 1.0),  max(0.0, -uFilterType) * uTreble * 1.0);

    // Reconstruct world-space ray from screen UV.
    vec2 ndc = vUV * 2.0 - 1.0;

    // Sample two depths to get a ray direction that is independent of z convention.
    vec4 nearH = uInverseViewProj * vec4(ndc, 0.0, 1.0);
    vec4 farH  = uInverseViewProj * vec4(ndc, 1.0, 1.0);
    vec3 nearP  = nearH.xyz / nearH.w;
    vec3 farP   = farH.xyz  / farH.w;

    vec3 rayDir = normalize(farP - nearP);
    vec3 rayPos = uCameraPos;

    bool hit = false;
    float i = float(Iterations);
    for (int j = 0; j < Iterations; j++) {
        float dist = distfunc(rayPos * scale, thickness, superQuadPower) / scale;
        rayPos += dist * rayDir;
        if (abs(dist) < 0.001) {
            i = float(j);
            hit = true;
            break;
        }
    }

    if (!hit) {
        gl_FragColor = texture2D(textureSampler, vUV);
        return;
    }

    vec3 normal = normalize(gradient(rayPos * scale, thickness, superQuadPower));

    float ao    = 1.0 - i / float(Iterations);
    float rim   = pow(max(0.0, dot(normal, -rayDir)), 2.0);
    float light = ao * rim * 1.4;

    // Color cycles with time; bass accelerates the cycle
    vec3 col = (cos(rayPos / 2.0 + uBass * 3.0) + 2.0) / 3.0;
    col      *= colorMod;
    vec3 env     = sampleEnv(reflect(rayDir, normal));

    gl_FragColor = vec4(col * light + 0.1 * env, 1.0);
}
