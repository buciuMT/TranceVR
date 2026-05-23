precision highp float;

varying vec2 vUv;
uniform sampler2D textureSampler;

uniform float intensity;
uniform float time;

void main() {
    vec2 uv = vUv - 0.5;

    // Kaleidoscope: mirror UV in angular segments
    float segments = 6.0;
    float angle = atan(uv.y, uv.x);
    float radius = length(uv);

    // Mirror angle across segments
    float segmentAngle = 6.28318 / segments;
    angle = mod(angle, segmentAngle * 2.0);
    angle = min(angle, segmentAngle * 2.0 - angle);
    angle = abs(angle - segmentAngle * 0.5);

    // Reconstruct mirrored UV
    vec2 mirroredUv = vec2(cos(angle), sin(angle)) * radius + 0.5;

    // Sample scene at mirrored UV
    vec4 color = texture2D(textureSampler, mirroredUv);

    // Blend with original based on intensity
    vec4 original = texture2D(textureSampler, vUv);
    color = mix(original, color, intensity);

    // Darken edges of segments
    float edgeFactor = abs(sin(angle * segments * 0.5)) * 0.3 + 0.7;
    color.rgb *= mix(1.0, edgeFactor, intensity);

    gl_FragColor = color;
}
