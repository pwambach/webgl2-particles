const fragmentPostShader = `#version 300 es
  precision lowp float;
  uniform sampler2D tex;
  in vec2 v_uv;
  out vec4 color;

  void main() {
    vec4 texColor = texture(tex, v_uv / 2.0 + 0.5);
    float intensity = 1.0 - texColor.r;

    vec3 finalColor = texColor.rgb;

    if (intensity > 0.5) {
      finalColor.r *= 3.0;
      finalColor.b *= finalColor.r;
      finalColor.g = 1.0 - finalColor.b;
      finalColor.r = 1.0 - finalColor.r * finalColor.g;
      finalColor.rgb = finalColor.brg;
    }

    color = vec4(finalColor, 1.0);
  }
`;
