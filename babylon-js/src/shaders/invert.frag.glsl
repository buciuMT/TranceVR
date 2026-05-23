precision highp float;

varying vec2 vUv;
uniform sampler2D textureSampler;

uniform float intensity;
uniform float time;

void main() {
    vec4 color = texture2D(textureSampler, vUv);

    // Color inversion
    vec3 inverted = 1.0 - color.rgb;
    color.rgb = mix(color.rgb, inverted, intensity);

    // Scanlines
    float scanline = sin(vUv.y * 400.0) * 0.05;
    color.rgb -= scanline * intensity;

    // Subtle CRT vignette
    float vignette = 1.0 - length(vUv - 0.5) * 1.2;
    vignette = smoothstep(0.0, 1.0, vignette);
    color.rgb *= mix(1.0, vignette, intensity * 0.5);

    gl_FragColor = color;
}
