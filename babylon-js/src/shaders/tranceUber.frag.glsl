precision highp float;

varying vec2 vUV;  // Babylon.js PostProcess standard varying name
uniform sampler2D textureSampler;

// ---- Per‑effect intensities (0 = off, 1 = full) ----
uniform float uTranceIntensity;
uniform float uChromaticIntensity;
uniform float uPulseIntensity;
uniform float uKaleidoscopeIntensity;
uniform float uInvertIntensity;

// ---- Trance‑specific uniforms ----
uniform float uTranceHueShift;
uniform float uTranceWaveStrength;
uniform float uTranceAudioReactivity;
uniform vec3  uTranceColorTint;

// ---- Pulse‑specific ----
uniform float uPulseLevel;

// ---- Global ----
uniform float uTime;

// =========================================================================
// Hash & noise helpers
// =========================================================================

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
        0.299 + 0.701 * cosA + 0.168 * sinA,
        0.587 - 0.587 * cosA + 0.330 * sinA,
        0.114 - 0.114 * cosA - 0.497 * sinA,

        0.299 - 0.299 * cosA - 0.328 * sinA,
        0.587 + 0.413 * cosA + 0.035 * sinA,
        0.114 - 0.114 * cosA + 0.292 * sinA,

        0.299 - 0.300 * cosA + 1.250 * sinA,
        0.587 - 0.588 * cosA - 1.050 * sinA,
        0.114 + 0.886 * cosA - 0.203 * sinA
    );
    return color * rot;
}

// =========================================================================
// Effect functions — each takes (color, uv) and returns new color
// =========================================================================

vec3 applyTrance(vec3 color, vec2 uv) {
    // Wave distortion on UV
    float wave = sin(uv.y * 12.0 + uTime * 2.0) * cos(uv.x * 8.0 - uTime * 1.5);
    wave += noise(uv * 6.0 + uTime * 0.7) * 0.5;
    vec2 distortedUv = uv + wave * uTranceWaveStrength * 0.03;

    // Re‑sample with distorted UV
    vec3 distorted = texture2D(textureSampler, distortedUv).rgb;

    // Hue rotation
    vec3 col = hueRotate(distorted, uTranceHueShift);

    // Audio‑reactive vignette
    float vig = 1.0 - length(uv - 0.5) * 1.5;
    vig = smoothstep(0.0, 1.0, vig);
    vig *= 1.0 + uTranceAudioReactivity * 0.015;

    // Noise overlay
    float n = noise(uv * 10.0 + uTime * 0.3);
    col += n * uTranceAudioReactivity * 0.0008;

    // Color tint
    col = mix(col, col * uTranceColorTint, 0.3);

    // Vignette
    col *= vig;

    return col;
}

vec3 applyChromatic(vec3 color, vec2 uv) {
    vec2 center = uv - 0.5;
    float dist = length(center);

    float split = uChromaticIntensity * 0.03 * (1.0 + dist * 2.0);
    vec2 dir = normalize(center + 0.0001);

    float r = texture2D(textureSampler, uv + dir * split).r;
    float g = texture2D(textureSampler, uv).g;
    float b = texture2D(textureSampler, uv - dir * split).b;

    vec3 col = vec3(r, g, b);

    // Scanline
    col += sin(uv.y * 300.0 + uTime) * 0.03;

    return col;
}

vec3 applyPulse(vec3 color, vec2 uv) {
    // Brightness pulse
    float pulse = 1.0 + uPulseLevel * uPulseIntensity * 0.8;
    vec3 col = color * pulse;

    // Desaturate toward edges
    float vig = 1.0 - length(uv - 0.5) * 0.6;
    float sat = mix(1.0, vig, uPulseLevel * uPulseIntensity);
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(gray), col, sat);

    return col;
}

vec3 applyKaleidoscope(vec3 color, vec2 uv) {
    vec2 centered = uv - 0.5;

    float segments = 6.0;
    float angle = atan(centered.y, centered.x);
    float radius = length(centered);

    float segAngle = 6.28318 / segments;
    angle = mod(angle, segAngle * 2.0);
    angle = min(angle, segAngle * 2.0 - angle);
    angle = abs(angle - segAngle * 0.5);

    vec2 mirroredUv = vec2(cos(angle), sin(angle)) * radius + 0.5;

    vec3 mirrored = texture2D(textureSampler, mirroredUv).rgb;
    vec3 col = mix(color, mirrored, uKaleidoscopeIntensity);

    float edge = abs(sin(angle * segments * 0.5)) * 0.3 + 0.7;
    col *= mix(1.0, edge, uKaleidoscopeIntensity);

    return col;
}

vec3 applyInvert(vec3 color, vec2 uv) {
    vec3 inverted = 1.0 - color;
    vec3 col = mix(color, inverted, uInvertIntensity);

    // Scanlines
    col -= sin(uv.y * 400.0) * 0.05 * uInvertIntensity;

    // CRT vignette
    float vig = 1.0 - length(uv - 0.5) * 1.2;
    vig = smoothstep(0.0, 1.0, vig);
    col *= mix(1.0, vig, uInvertIntensity * 0.5);

    return col;
}

// =========================================================================
// Main
// =========================================================================

void main() {
    vec4 tex = texture2D(textureSampler, vUV);
    vec3 color = tex.rgb;

    // Apply effects in fixed order — each is a mix(original, effectResult, intensity)
    // so when intensity ≈ 0 the effect is a no‑op.

    if (uTranceIntensity > 0.001) {
        vec3 tranced = applyTrance(color, vUV);
        color = mix(color, tranced, uTranceIntensity);
    }

    if (uChromaticIntensity > 0.001) {
        vec3 chromed = applyChromatic(color, vUV);
        color = mix(color, chromed, uChromaticIntensity);
    }

    if (uPulseIntensity > 0.001) {
        vec3 pulsed = applyPulse(color, vUV);
        color = mix(color, pulsed, uPulseIntensity);
    }

    if (uKaleidoscopeIntensity > 0.001) {
        vec3 kaleid = applyKaleidoscope(color, vUV);
        color = mix(color, kaleid, uKaleidoscopeIntensity);
    }

    if (uInvertIntensity > 0.001) {
        vec3 inverted = applyInvert(color, vUV);
        color = mix(color, inverted, uInvertIntensity);
    }

    gl_FragColor = vec4(color, tex.a);
}
