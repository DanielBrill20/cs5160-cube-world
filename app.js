const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
if (!gl) throw new Error("WebGL is not available in this browser.");

const vertexSource = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  uniform mat4 uModel, uView, uProjection;
  varying vec3 vNormal;
  varying vec3 vColor;
  void main() {
    vNormal = normalize(mat3(uModel) * aNormal);
    vColor = aColor;
    gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
  }
`;
const fragmentSource = `
  precision mediump float;
  varying vec3 vNormal;
  varying vec3 vColor;
  void main() {
    vec3 lightDirection = normalize(vec3(0.5, 1.0, 0.35));
    float brightness = 0.28 + 0.72 * max(dot(normalize(vNormal), lightDirection), 0.0);
    gl_FragColor = vec4(vColor * brightness, 1.0);
  }
`;

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}
const program = gl.createProgram();
gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
  throw new Error(gl.getProgramInfoLog(program));
}
gl.useProgram(program);

const cubeData = new Float32Array([
  -0.5,0,0.5, 0,0,1, 0.5,0,0.5, 0,0,1, 0.5,1,0.5, 0,0,1,
  -0.5,0,0.5, 0,0,1, 0.5,1,0.5, 0,0,1, -0.5,1,0.5, 0,0,1,
  0.5,0,-0.5, 0,0,-1, -0.5,0,-0.5, 0,0,-1, -0.5,1,-0.5, 0,0,-1,
  0.5,0,-0.5, 0,0,-1, -0.5,1,-0.5, 0,0,-1, 0.5,1,-0.5, 0,0,-1,
  -0.5,1,-0.5, 0,1,0, -0.5,1,0.5, 0,1,0, 0.5,1,0.5, 0,1,0,
  -0.5,1,-0.5, 0,1,0, 0.5,1,0.5, 0,1,0, 0.5,1,-0.5, 0,1,0,
  -0.5,0,-0.5, 0,-1,0, 0.5,0,-0.5, 0,-1,0, 0.5,0,0.5, 0,-1,0,
  -0.5,0,-0.5, 0,-1,0, 0.5,0,-0.5, 0,-1,0, 0.5,0,0.5, 0,-1,0,
  0.5,0,-0.5, 1,0,0, 0.5,1,-0.5, 1,0,0, 0.5,1,0.5, 1,0,0,
  0.5,0,-0.5, 1,0,0, 0.5,1,0.5, 1,0,0, 0.5,0,0.5, 1,0,0,
  -0.5,0,-0.5, -1,0,0, -0.5,0,0.5, -1,0,0, -0.5,1,0.5, -1,0,0,
  -0.5,0,-0.5, -1,0,0, -0.5,1,0.5, -1,0,0, -0.5,1,-0.5, -1,0,0
]);
const cubeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeData, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, "aPosition");
const aNormal = gl.getAttribLocation(program, "aNormal");
gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aNormal);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);
const aColor = gl.getAttribLocation(program, "aColor");
const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, 36 * 3 * Float32Array.BYTES_PER_ELEMENT, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(aColor);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
const uModel = gl.getUniformLocation(program, "uModel");
const uView = gl.getUniformLocation(program, "uView");
const uProjection = gl.getUniformLocation(program, "uProjection");
const vertexColors = new Float32Array(36 * 3);

function model(x, y, z, sx, sy, sz, rotation = 0) {
  const c = Math.cos(rotation), s = Math.sin(rotation);
  return [sx*c,0,sx*s,0, 0,sy,0,0, -sz*s,0,sz*c,0, x,y,z,1];
}
function perspective(fov, aspect, near, far) {
  const f = 1 / Math.tan(fov / 2), range = 1 / (near - far);
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(near+far)*range,-1, 0,0,2*near*far*range,0];
}
function normalize(v) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0]/n, v[1]/n, v[2]/n];
}
function cross(a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; }
function dot(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function lookAt(eye, target) {
  const z = normalize([eye[0]-target[0], eye[1]-target[1], eye[2]-target[2]]);
  const x = normalize(cross([0,1,0], z)), y = cross(z, x);
  return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
    -dot(x,eye),-dot(y,eye),-dot(z,eye),1];
}

const state = {
  resolution: 16, color: null, height: null, heightMaps: {}, selectedHeightMap: 1,
  cubes: [], started: performance.now(),
  animate: true, cameraAngle: 0, animationTime: 0, lastFrameTime: null
};
const worldSize = 14.4;
const flowers = [
  { path: [[-5.5, 5.6, -5.4], [-2.0, 6.4, -5.2], [2.0, 6.1, -5.6], [5.5, 5.8, -5.4]], phase: 0.00, center: [0.45, 0.02, 0.02], petals: [1.0, 0.05, 0.05] },
  { path: [[-5.5, 5.8, -3.6], [-2.0, 6.6, -3.4], [2.0, 5.9, -3.8], [5.5, 6.0, -3.6]], phase: 0.22, center: [0.5, 0.2, 0.01], petals: [1.0, 0.5, 0.02] },
  { path: [[-5.5, 5.5, -1.8], [-2.0, 6.3, -1.6], [2.0, 6.2, -2.0], [5.5, 5.7, -1.8]], phase: 0.44, center: [0.5, 0.45, 0.01], petals: [1.0, 0.9, 0.02] },
  { path: [[-5.5, 5.9, 0.0], [-2.0, 6.7, 0.2], [2.0, 6.0, -0.2], [5.5, 5.8, 0.0]], phase: 0.66, center: [0.02, 0.45, 0.04], petals: [0.15, 0.9, 0.15] },
  { path: [[-5.5, 5.6, 1.8], [-2.0, 6.4, 2.0], [2.0, 6.1, 1.6], [5.5, 5.9, 1.8]], phase: 0.88, center: [0.01, 0.2, 0.5], petals: [0.05, 0.45, 1.0] },
  { path: [[-5.5, 5.8, 3.6], [-2.0, 6.5, 3.4], [2.0, 6.0, 3.8], [5.5, 5.7, 3.6]], phase: 1.10, center: [0.1, 0.02, 0.5], petals: [0.35, 0.1, 1.0] },
  { path: [[-5.5, 5.7, 5.4], [-2.0, 6.3, 5.6], [2.0, 6.2, 5.2], [5.5, 5.9, 5.4]], phase: 1.32, center: [0.35, 0.02, 0.45], petals: [0.8, 0.1, 0.9] }
];
function loadImageAsset(path, target) {
  const image = new Image();
  image.onload = () => {
    const size = Math.max(image.width, image.height), offscreen = document.createElement("canvas");
    offscreen.width = offscreen.height = size;
    const context = offscreen.getContext("2d");
    context.drawImage(image, 0, 0, size, size);
    if (target === "heightMaps") {
      state.heightMaps[path] = context.getImageData(0, 0, size, size);
      state.height = state.heightMaps[
        state.selectedHeightMap === 1 ? "assets/grayscale_source1.jpg" : "assets/grayscale_source2.png"
      ];
    } else {
      state[target] = context.getImageData(0, 0, size, size);
    }
    if (state.color && state.height) {
      rebuild();
    }
  };
  image.onerror = () => {
    console.error("Unable to load image asset:", path);
  };
  image.src = path;
}
function sampleRegion(image, col, row, resolution) {
  const startX = Math.floor(col * image.width / resolution);
  const endX = Math.max(startX + 1, Math.ceil((col + 1) * image.width / resolution));
  const startY = Math.floor(row * image.height / resolution);
  const endY = Math.max(startY + 1, Math.ceil((row + 1) * image.height / resolution));
  const sum = [0, 0, 0];
  let count = 0;
  for (let y = startY; y < Math.min(endY, image.height); y++) {
    for (let x = startX; x < Math.min(endX, image.width); x++) {
      const i = (y * image.width + x) * 4;
      sum[0] += image.data[i];
      sum[1] += image.data[i + 1];
      sum[2] += image.data[i + 2];
      count++;
    }
  }
  return [sum[0] / (255 * count), sum[1] / (255 * count), sum[2] / (255 * count)];
}
function rebuild() {
  if (!state.color || !state.height) return;
  const n = state.resolution, color = state.color, height = state.height;
  const cubeSize = worldSize / n;
  state.cubes = [];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const rgb = sampleRegion(color, col, row, n);
    const gray = sampleRegion(height, col, row, n);
    state.cubes.push({
      x: (col - (n - 1) / 2) * cubeSize, z: (row - (n - 1) / 2) * cubeSize,
      width: cubeSize * 0.98, depth: cubeSize * 0.98,
      height: 0.35 + (gray[0] * 0.3 + gray[1] * 0.59 + gray[2] * 0.11) * 4.2,
      color: rgb
    });
  }
}
function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u*u*u*p0[0] + 3*u*u*t*p1[0] + 3*u*t*t*p2[0] + t*t*t*p3[0],
    u*u*u*p0[1] + 3*u*u*t*p1[1] + 3*u*t*t*p2[1] + t*t*t*p3[1],
    u*u*u*p0[2] + 3*u*u*t*p1[2] + 3*u*t*t*p2[2] + t*t*t*p3[2]
  ];
}
function drawCube(matrix, color) {
  for (let vertex = 0; vertex < 36; vertex++) {
    const variation = 0.92 + (vertex % 3) * 0.04;
    vertexColors[vertex * 3] = Math.min(1, color[0] * variation);
    vertexColors[vertex * 3 + 1] = Math.min(1, color[1] * variation);
    vertexColors[vertex * 3 + 2] = Math.min(1, color[2] * variation);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertexColors);
  gl.uniformMatrix4fv(uModel, false, matrix);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}
function drawFlower(flower, time) {
  const cycle = ((time - state.started) * 0.00008 + flower.phase) % 2;
  const t = cycle <= 1 ? cycle : 2 - cycle;
  const p = bezier(flower.path[0], flower.path[1], flower.path[2], flower.path[3], t);
  const spin = time * 0.0015;
  drawCube(model(p[0], p[1], p[2], 0.45, 0.275, 0.45, spin), flower.center);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + spin;
    drawCube(model(p[0] + Math.cos(a) * 0.425, p[1], p[2] + Math.sin(a) * 0.425,
      0.325, 0.11, 0.525, a), flower.petals);
  }
  drawCube(model(p[0], p[1] - 0.5, p[2], 0.08, 0.9, 0.08), [0.2, 0.8, 0.3]);
}
function resize() {
  const scale = window.devicePixelRatio || 1;
  const width = Math.floor(canvas.clientWidth * scale), height = Math.floor(canvas.clientHeight * scale);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  gl.viewport(0, 0, canvas.width, canvas.height);
}
function draw(time) {
  resize();
  if (state.lastFrameTime === null) state.lastFrameTime = time;
  const elapsed = time - state.lastFrameTime;
  state.lastFrameTime = time;
  if (state.animate) {
    state.animationTime += elapsed;
    state.cameraAngle += elapsed * 0.00012;
  }
  const radius = 12;
  const eye = [Math.cos(state.cameraAngle) * radius, 11, Math.sin(state.cameraAngle) * radius];
  const lookAtHeight = -1;
  gl.clearColor(0.04, 0.06, 0.15, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.uniformMatrix4fv(uProjection, false, perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 600));
  gl.uniformMatrix4fv(uView, false, lookAt(eye, [0, lookAtHeight, 0]));
  for (const cube of state.cubes) {
    drawCube(model(cube.x, 0, cube.z, cube.width, cube.height, cube.depth), cube.color);
  }
  for (const flower of flowers) drawFlower(flower, state.started + state.animationTime);
  requestAnimationFrame(draw);
}

document.getElementById("resolution").addEventListener("input", (event) => {
  state.resolution = Number(event.target.value);
  document.getElementById("resolutionValue").textContent =
    state.resolution + " x " + state.resolution;
  rebuild();
});
document.getElementById("animate").addEventListener("change", (event) => { state.animate = event.target.checked; });
function selectHeightMap(mapNumber) {
  const path = mapNumber === 1 ? "assets/grayscale_source1.jpg" : "assets/grayscale_source2.png";
  if (!state.heightMaps[path]) return;
  state.selectedHeightMap = mapNumber;
  state.height = state.heightMaps[path];
  document.getElementById("heightMap1").classList.toggle("selected", mapNumber === 1);
  document.getElementById("heightMap1").setAttribute("aria-pressed", String(mapNumber === 1));
  document.getElementById("heightMap2").classList.toggle("selected", mapNumber === 2);
  document.getElementById("heightMap2").setAttribute("aria-pressed", String(mapNumber === 2));
  rebuild();
}
document.getElementById("heightMap1").addEventListener("click", () => selectHeightMap(1));
document.getElementById("heightMap2").addEventListener("click", () => selectHeightMap(2));
loadImageAsset("assets/murakami_source.webp", "color");
loadImageAsset("assets/grayscale_source1.jpg", "heightMaps");
loadImageAsset("assets/grayscale_source2.png", "heightMaps");
requestAnimationFrame(draw);
