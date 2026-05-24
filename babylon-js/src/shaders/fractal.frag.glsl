precision highp float;

varying vec2 vUV;
uniform sampler2D textureSampler;  // Babylon scene render (unused)

uniform vec2 uResolution;
uniform float uTime;

// Environment map (equirectangular, sampler 1)
uniform sampler2D envSampler;
uniform float uEnvMapAvailable;  // 0 = procedural fallback, 1 = use envSampler

// Parameters (all 0–1 normalised)
uniform float uSpikiness;  // 0.5 → SuperQuadPower = 10 (original)
uniform float uThickness;  // 0.5 → Thickness = 0.15 (close to original 0.1)
uniform float uNoise;      // reserved
uniform float uShift;      // reserved
uniform float uTone;       // reserved

// =========================================================================
// Constants
// =========================================================================

#define Iterations 16
#define PI 3.14159265359

// =========================================================================
// Original truchet-fractal distance functions
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
// Environment map sampling (equirectangular)
// =========================================================================

vec2 envMapUV(vec3 dir) {
    float u = atan(dir.z, dir.x) / (2.0 * PI) + 0.5;
    float v = asin(clamp(dir.y, -1.0, 1.0)) / PI + 0.5;
    return vec2(u, v);
}

vec3 proceduralEnv(vec3 dir) {
    float t = dir.y * 0.5 + 0.5;
    return mix(vec3(0.02, 0.02, 0.06), vec3(0.1, 0.05, 0.2), t);
}

vec3 sampleEnv(vec3 dir) {
    if (uEnvMapAvailable < 0.5) return proceduralEnv(dir);
    vec2 uv = envMapUV(dir);
    return texture2D(envSampler, uv).rgb;
}

// =========================================================================
// Raymarch
// =========================================================================

vec4 march(vec3 rayPos, vec3 rayDir, float thickness, float superQuadPower) {
    float i = float(Iterations);
    for (int j = 0; j < Iterations; j++) {
        float dist = distfunc(rayPos, thickness, superQuadPower);
        rayPos += dist * rayDir;

        if (abs(dist) < 0.001) {
            i = float(j);
            break;
        }
    }

    vec3 normal = normalize(gradient(rayPos, thickness, superQuadPower));

    float ao = 1.0 - i / float(Iterations);
    float what = pow(max(0.0, dot(normal, -rayDir)), 2.0);
    float light = ao * what * 1.4;

    vec3 col = (cos(rayPos / 2.0) + 2.0) / 3.0;

    vec3 reflected = reflect(rayDir, normal);
    vec3 env = sampleEnv(reflected);

    return vec4(col * light + 0.1 * env, 1.0);
}

// =========================================================================
// Main
// =========================================================================

void main(void) {
    // Map parameters from 0–1 to shader ranges
    float thickness = mix(0.0, 0.3, uThickness);
    float superQuadPower = mix(1.0, 20.0, uSpikiness);

    // Convert vUV → fragCoord (Shadertoy-style)
    vec2 fragCoord = vUV * uResolution;

    vec2 coords = (2.0 * fragCoord.xy - uResolution.xy) / length(uResolution.xy);

    float a = uTime / 3.0;
    mat3 m = mat3(
        0.0, 1.0, 0.0,
        -sin(a), 0.0, cos(a),
        cos(a), 0.0, sin(a)
    );
    m *= m;
    m *= m;

    vec3 rayDir = m * normalize(vec3(2.0 * coords, -1.0 + dot(coords, coords)));

    float t = uTime / 3.0;
    vec3 rayPos = vec3(
        2.0 * (sin(t + sin(2.0 * t) / 2.0) / 2.0 + 0.5),
        2.0 * (sin(t - sin(2.0 * t) / 2.0 - PI / 2.0) / 2.0 + 0.5),
        2.0 * ((-2.0 * (t - sin(4.0 * t) / 4.0) / PI) + 0.5 + 0.5)
    );

    vec4 fragColor = march(rayPos, rayDir, thickness, superQuadPower);

    float vignette = pow(1.0 - length(coords), 0.3);
    fragColor.xyz *= vec3(vignette);

    gl_FragColor = fragColor;
}
