precision highp float;

varying vec3 vWorldPos;
varying vec3 vCameraPos;

uniform float uTime;
uniform float uSpikiness;
uniform float uThickness;

// =========================================================================
// Constants
// =========================================================================

#define Iterations 32
#define PI 3.14159265359

// =========================================================================
// Distance functions (from original Shadertoy)
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
// Procedural environment
// =========================================================================

vec3 proceduralEnv(vec3 dir) {
    float t = dir.y * 0.5 + 0.5;
    return mix(vec3(0.02, 0.02, 0.06), vec3(0.1, 0.05, 0.2), t);
}

// =========================================================================
// Main
// =========================================================================

void main(void) {
    float thickness = mix(0.0, 0.3, uThickness);
    float superQuadPower = mix(1.0, 20.0, uSpikiness);

    // Ray starts at camera, goes through this surface vertex into the world
    vec3 rayDir = normalize(vWorldPos - vCameraPos);
    vec3 rayPos = vCameraPos;

    bool hit = false;
    float i = float(Iterations);
    for (int j = 0; j < Iterations; j++) {
        float dist = distfunc(rayPos, thickness, superQuadPower);
        rayPos += dist * rayDir;

        if (abs(dist) < 0.001) {
            i = float(j);
            hit = true;
            break;
        }
    }

    // Miss → purple debug
    if (!hit) {
        gl_FragColor = vec4(0.5, 0.0, 1.0, 1.0);
        return;
    }

    vec3 normal = normalize(gradient(rayPos, thickness, superQuadPower));

    float ao = 1.0 - i / float(Iterations);
    float what = pow(max(0.0, dot(normal, -rayDir)), 2.0);
    float light = ao * what * 1.4;

    vec3 col = (cos(rayPos / 2.0) + 2.0) / 3.0;

    vec3 reflected = reflect(rayDir, normal);
    vec3 env = proceduralEnv(reflected);

    gl_FragColor = vec4(col * light + 0.1 * env, 1.0);
}
