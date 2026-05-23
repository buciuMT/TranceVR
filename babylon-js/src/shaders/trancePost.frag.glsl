precision highp float;

varying vec2 vUv;

uniform sampler2D textureSampler;

uniform float time;
uniform float intensity;
uniform float hueShift;
uniform float waveStrength;
uniform float audioReactivity;
uniform vec3 colorTint;

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
        mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
        f.y
    );
}

vec3 hueRotate(vec3 color, float shift) {
    float angle = shift * 6.28318;
    float cosA = cos(angle);
    float sinA = sin(angle);
    mat3 rot = mat3(
        0.299 + 0.701 * cosA + 0.168 * sinA,  0.587 - 0.587 * cosA + 0.330 * sinA,  0.114 - 0.114 * cosA - 0.497 * sinA,
        0.299 - 0.299 * cosA - 0.328 * sinA,  0.587 + 0.413 * cosA + 0.035 * sinA,  0.114 - 0.114 * cosA + 0.292 * sinA,
        0.299 - 0.300 * cosA + 1.250 * sinA,  0.587 - 0.588 * cosA - 1.050 * sinA,  0.114 + 0.886 * cosA - 0.203 * sinA
    );
    return color * rot;
}

void main() {
    // Wave distortion on UV
    float wave = sin(vUv.y * 12.0 + time * 2.0) * cos(vUv.x * 8.0 - time * 1.5);
    wave += noise(vUv * 6.0 + time * 0.7) * 0.5;
    vec2 distortedUv = vUv + wave * waveStrength * 0.03 * intensity;

    // Original scene
    vec4 original = texture2D(textureSampler, distortedUv);

    // Hue shift
    vec3 color = hueRotate(original.rgb, hueShift * intensity);

    // Audio-reactive vignette
    float vignette = 1.0 - length(vUv - 0.5) * 1.5;
    vignette = smoothstep(0.0, 1.0, vignette);
    vignette *= 1.0 + audioReactivity * 0.015 * intensity;

    // Noise overlay
    float n = noise(vUv * 10.0 + time * 0.3);
    color += n * audioReactivity * 0.0008 * intensity;

    // Color tint
    color = mix(color, color * colorTint, intensity * 0.3);

    // Vignette
    color *= vignette;

    gl_FragColor = vec4(color, original.a);
}
