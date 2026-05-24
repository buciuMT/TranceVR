precision highp float;

varying vec2 vUv;
uniform sampler2D textureSampler;

uniform float intensity;
uniform float pulseLevel;
uniform float time;

void main() {
    vec4 color = texture2D(textureSampler, vUv);

    // Pulsing brightness based on audio
    float pulse = 1.0 + pulseLevel * intensity * 0.8;
    color.rgb *= pulse;

    // Subtle desaturation toward edges during pulse
    float vignette = 1.0 - length(vUv - 0.5) * 0.6;
    float saturationPulse = mix(1.0, vignette, pulseLevel * intensity);
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    color.rgb = mix(vec3(gray), color.rgb, saturationPulse);

    gl_FragColor = color;
}
