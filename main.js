const canvas = document.getElementById("canvas");
const gl = canvas.getContext('webgl2', {antialias: false});
const rS = new rStats({CSSPath: 'libs/'});
const mousePos = [0, 0];

/* Check WebGL2 */
if (!gl) {
  document.querySelector('.no-webgl2').style.display = 'block';
}

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
canvas.addEventListener('touchmove', event => {
  mousePos[0] = event.touches[0].clientX / canvas.width * 2 - 1;
  mousePos[1] = (event.touches[0].clientY / canvas.height * 2 - 1) * -1;
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

/* Set clear color */
gl.clearColor(1.0, 1.0, 1.0, 1.0);

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

/* Create Velocity Buffer */
const quadArray = new Float32Array([
  -1.0, -1.0,
  -1.0, 1.0,
  1.0, 1.0,

  1.0, 1.0,
  1.0, -1.0,
  -1.0, -1.0
]);
const quadBuffer = createBufferFromArray(quadArray);

/* Create program with feedback */
const programFeedback = createProgram(gl,
  vertexFeedbackShader,
  fragmentEmptyShader,
  ['v_position', 'v_velocity'],
  gl.SEPARATE_ATTRIBS
);

// get uniform location for mouse position
const mousePosLocation = gl.getUniformLocation(programFeedback, "u_mouse");

/* Create program to render particles */
const programDisplay = createProgram(gl,
  vertexDisplayShader,
  fragmentDisplayShader
);

/* Create program to post process framebuffer */
const programPost = createProgram(gl,
  vertexPostShader,
  fragmentPostShader
);

// get uniform location for texture
const texLocation = gl.getUniformLocation(programPost, "tex");

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

const postVAO = createVAO([{
  data: quadBuffer,
  location: VERTEX_ATTRIBUTE_POS,
  elementSize: 2
}]);

/* Create empty textures for framebuffer */
const texture = gl.createTexture();
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

/* Create a framebuffer and attach the texture */
const framebuffer = gl.createFramebuffer();

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
  gl.bindVertexArray(feedbackVAOs[currentIndex]);
  gl.drawArrays(gl.POINTS, 0, numberOfPoints);
  gl.bindVertexArray(null);
  gl.endTransformFeedback();

  /* Re-activate rasterizer for next draw calls */
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, null);
}

/* Draw result from feedback to framebuffer */
function drawToFrameBuffer(index) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(programDisplay);
  gl.bindVertexArray(displayVAOs[index]);
  gl.drawArrays(gl.POINTS, 0, numberOfPoints);
  gl.bindVertexArray(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawQuad() {
  gl.useProgram(programPost);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.uniform1i(texLocation, 0);
  gl.bindVertexArray(postVAO);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);
}

/* Ping Pong index */
let currentIndex = 0;

function loop() {
  rS('rAF').tick();

  const invertedIndex = invert(currentIndex);

  calculateFeedback(currentIndex);
  drawToFrameBuffer(invertedIndex);

  gl.clear(gl.CLEAR_COLOR_BIT);

  drawQuad();


  // switch index for next iteration
  currentIndex = invert(currentIndex);
  requestAnimationFrame(loop);

  rS().update();
}

/* Start the render loop */
loop();