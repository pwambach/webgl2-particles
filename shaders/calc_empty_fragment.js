const fragmentEmptyShader = `#version 300 es
  precision lowp float;
  out vec4 color;

  // will not be used
  void main() {
    color = vec4(1.0);
  }
`;
