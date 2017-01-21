const vertexFeedbackShader = `#version 300 es

  layout(location = 0) in vec4 a_position;
  layout(location = 1) in vec2 a_velocity;
  flat out vec2 v_position;
  flat out vec2 v_velocity;
  uniform vec2 u_mouse;

  float PARTICLE_MASS = 1.0;
  float GRAVITY_CENTER_MASS = 100.0;
  float DAMPING = 1e-6;

  void main() {
    vec2 gravityCenter = u_mouse;
    
    float r = distance(a_position.xy, gravityCenter);
    vec2 direction = gravityCenter - a_position.xy;
    float force = PARTICLE_MASS * GRAVITY_CENTER_MASS / (r * r) * DAMPING;
    float maxForce = min(force, DAMPING * 10.0);
    
    vec2 acceleration = force / PARTICLE_MASS * direction;
    vec2 newVelocity = a_velocity + acceleration;
    vec2 newPosition = a_position.xy + newVelocity;

    v_velocity = newVelocity * 0.99;
    v_position = newPosition;

    // bounce at borders
    if (v_position.x > 1.0 || v_position.x < -1.0) {
      v_velocity.x *= -0.5;
    }

    if (v_position.y > 1.0 || v_position.y < -1.0) {
      v_velocity.y *= -0.5;
    }
  }
`;
