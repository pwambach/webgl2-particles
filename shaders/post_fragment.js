const fragmentPostShader = `#version 300 es
  precision lowp float;
  uniform sampler2D tex;
  in vec2 v_uv;
  out vec4 color;

  void main() {
    float texColor = texture(tex, v_uv / 2.0 + 0.5).r;
    
    vec3 outColor = vec3(texColor);
    
    if (texColor < 0.08) {
      outColor = vec3(1.0 - texColor, 0.0, 0.0);
    }

    if (texColor < 0.02) {
      outColor = vec3(1.0, 1.0, 0.0);
    }

    color = vec4(outColor, 1.0);
  }
`;
