const canvas = document.getElementById("canvas");
const gl = canvas.getContext('webgl2', {antialias: false});
const rS = new rStats({CSSPath: 'libs/'});
const mousePos = [0, 0];

/* Set number of points */
const pointsEl = document.getElementById('nrPoints');
const numberOfPoints = getJsonFromUrl().points
  ? parseInt(getJsonFromUrl().points)
  : 2e6;
pointsEl.innerHTML = new Intl.NumberFormat().format(numberOfPoints);

/* Update mouse position */
canvas.addEventListener('mousemove', event => {
  mousePos[0] = event.clientX / canvas.width * 2 - 1;
  mousePos[1] = (event.clientY / canvas.height * 2 - 1) * -1;
});

/* Handle canvas size */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener('resize', resize);
resize();

/* Use predefined attribute locations */
const VERTEX_ATTRIBUTE_POS = 0;
const VELOCITY_ATTRIBUTE_POS = 1;

/* Enable blending */
gl.enable(gl.BLEND);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

/* Create Vertex Buffers */
const vertices = new Float32Array(numberOfPoints * 2);
for (let i = 0; i < vertices.length; i++) {
  vertices[i] = Math.random() * 2 - 1;
}

const vertexBuffers = [
  createBufferFromArray(vertices),
  createBufferWithSize(numberOfPoints * 2 * 4)
];

/* Create Velocity Buffer */
const velocities = new Float32Array(numberOfPoints * 2);
for (let i = 0; i < velocities.length; i++) {
  velocities[i] = 0;
}

const velocityBuffers = [
  createBufferFromArray(velocities),
  createBufferWithSize(numberOfPoints * 2 * 4)
];

/* Create program with feedback */
const programFeedback = createProgram(gl,
  vertexFeedbackShader,
  fragmentEmptyShader,
  ['v_position', 'v_velocity'],
  gl.SEPARATE_ATTRIBS
);

// get uniform location for mouse position
const mousePosLocation = gl.getUniformLocation(programFeedback, "u_mouse");

/* Create program to display particles */
const programDisplay = createProgram(gl,
  vertexDisplayShader,
  fragmentDisplayShader
);

/* Create VAOs */
const feedbackVAOs = [];
const displayVAOs = [];

feedbackVAOs.push(createVAO([{
    data: vertexBuffers[0],
    location: VERTEX_ATTRIBUTE_POS,
    elementSize: 2
  },
  {
    data: velocityBuffers[0],
    location: VELOCITY_ATTRIBUTE_POS,
    elementSize: 2
  }]
));

feedbackVAOs.push(createVAO([{
    data: vertexBuffers[1],
    location: VERTEX_ATTRIBUTE_POS,
    elementSize: 2
  },
  {
    data: velocityBuffers[1],
    location: VELOCITY_ATTRIBUTE_POS,
    elementSize: 2
  }]
));

displayVAOs.push(createVAO([{
  data: vertexBuffers[0],
  location: VERTEX_ATTRIBUTE_POS,
  elementSize: 2
}]));

displayVAOs.push(createVAO([{
  data: vertexBuffers[1],
  location: VERTEX_ATTRIBUTE_POS,
  elementSize: 2
}]));

/* Draw a VAO */
function draw(vao) {
  gl.bindVertexArray(vao);
  gl.drawArrays(gl.POINTS, 0, numberOfPoints);
}

/* Create transform feedback */
const transformFeedback = gl.createTransformFeedback();

/* Fill the current feedback buffer */
function calculateFeedback(currentIndex) {
  const invertedIndex = invert(currentIndex);
  // Disable rasterization, vertex processing only
  gl.enable(gl.RASTERIZER_DISCARD);

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, transformFeedback);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, vertexBuffers[invertedIndex]);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, velocityBuffers[invertedIndex]);

  gl.useProgram(programFeedback);
  gl.uniform2fv(mousePosLocation, mousePos);

  gl.beginTransformFeedback(gl.POINTS);
  draw(feedbackVAOs[currentIndex]);
  gl.endTransformFeedback();

  /* Re-activate rasterizer for next draw calls */
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
}

/* Ping Pong index */
let currentIndex = 0;

function loop() {
  rS('rAF').tick();

  const invertedIndex = invert(currentIndex);

  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.CLEAR_COLOR_BIT);

  calculateFeedback(currentIndex);

  // draw result from previous iteration
  gl.useProgram(programDisplay);
  draw(displayVAOs[invertedIndex]);

  // switch index for next iteration
  currentIndex = invert(currentIndex);
  requestAnimationFrame(loop);

  rS().update();
}

/* Start the render loop */
loop();