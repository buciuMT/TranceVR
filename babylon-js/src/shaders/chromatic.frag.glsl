precision highp float;

varying vec2 vUv;
uniform sampler2D textureSampler;

uniform float intensity;
uniform float time;

void main() {
    vec2 center = vUv - 0.5;
    float dist = length(center);

    // Chromatic aberration: split R/G/B channels outward from center
    float split = intensity * 0.03 * (1.0 + dist * 2.0);
    vec2 dir = normalize(center + 0.0001);

    float r = texture2D(textureSampler, vUv + dir * split).r;
    float g = texture2D(textureSampler, vUv).g;
    float b = texture2D(textureSampler, vUv - dir * split).b;

    vec4 color = vec4(r, g, b, 1.0);

    // Subtle scanline
    float scanline = sin(vUv.y * 300.0 + time) * 0.03 * intensity;
    color.rgb += scanline;

    gl_FragColor = color;
}
