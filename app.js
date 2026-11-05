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
  const heightScale = n / 20;
  state.cubes = [];
  for (let row = 0; row < n; row++) for (let col = 0; col < n; col++) {
    const rgb = sampleRegion(color, col, row, n);
    const gray = sampleRegion(height, col, row, n);
    state.cubes.push({
      x: (col - (n - 1) / 2) * 0.9, z: (row - (n - 1) / 2) * 0.9,
      height: (0.35 + (gray[0] * 0.3 + gray[1] * 0.59 + gray[2] * 0.11) * 4.2) * heightScale,
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
function drawFlower(time) {
  const cycle = ((time - state.started) * 0.00008) % 2;
  const t = cycle <= 1 ? cycle : 2 - cycle;
  const heightScale = state.resolution / 20;
  const p = bezier(
    [-7, 7 * heightScale, -3],
    [-3, 10 * heightScale, 4],
    [4, 8 * heightScale, 5],
    [7, 6 * heightScale, -4],
    t
  );
  const spin = time * 0.0015;
  drawCube(model(p[0], p[1], p[2], 0.9, 0.55, 0.9, spin), [1, 0.78, 0.12]);
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + spin;
    drawCube(model(p[0] + Math.cos(a) * 0.85, p[1], p[2] + Math.sin(a) * 0.85,
      0.65, 0.22, 1.05, a), [1, 0.22 + i * 0.06, 0.55]);
  }
  drawCube(model(p[0], p[1] - 1.0, p[2], 0.16, 1.8, 0.16), [0.2, 0.8, 0.3]);
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
  const radius = Math.max(15, state.resolution * 0.63);
  const eye = [Math.cos(state.cameraAngle) * radius, radius * 0.72, Math.sin(state.cameraAngle) * radius];
  const lookAtHeight = 5 * (state.resolution / 20);
  gl.clearColor(0.04, 0.06, 0.15, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.uniformMatrix4fv(uProjection, false, perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 600));
  gl.uniformMatrix4fv(uView, false, lookAt(eye, [0, lookAtHeight-5, 0]));
  for (const cube of state.cubes) drawCube(model(cube.x, 0, cube.z, 0.88, cube.height, 0.88), cube.color);
  drawFlower(state.started + state.animationTime);
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
