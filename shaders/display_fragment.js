const fragmentDisplayShader = `#version 300 es
  precision lowp float;
  out vec4 color;

  void main() {
    color = vec4(0.0, 0.0, 0.0, 0.1);
  }
`;
