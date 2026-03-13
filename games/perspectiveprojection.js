// --- Three.js setup ---
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

let neutralEye = null; // will store the initial eye position
function isMobile() {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

const screenPixelWidth = window.screen.width;
const screenPixelHeight = window.screen.height;
const physicalPixelWidth = screenPixelWidth * window.devicePixelRatio;
const physicalPixelHeight = screenPixelHeight * window.devicePixelRatio;

const dpi = isMobile() ? 300 : 96
const inchToMeters = 0.0254
const screenWidthMeters  = physicalPixelWidth / dpi * inchToMeters;
const screenHeightMeters = physicalPixelHeight / dpi * inchToMeters;

const screenWidth = screenWidthMeters;   // meters
const screenHeight = screenHeightMeters; // meters
const roomDepth = 1.0;     // meters from screen to back wall
const eyeDistanceToScreen = 0.6

// Floor
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(screenWidth, roomDepth), // width = screen, depth = room
  new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -screenHeight / 2;
floor.position.z = -roomDepth/2; // place between screen and back wall
scene.add(floor);

// Ceiling
const ceiling = new THREE.Mesh(
  new THREE.PlaneGeometry(screenWidth, roomDepth),
  new THREE.MeshBasicMaterial({ color: 0xffffcc, side: THREE.DoubleSide })
);
ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = screenHeight / 2;
ceiling.position.z = -roomDepth/2;
scene.add(ceiling);

// Back Wall
const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(screenWidth, screenHeight),
  new THREE.MeshBasicMaterial({ color: 0xff9999, side: THREE.DoubleSide })
);
backWall.position.z = -roomDepth;
scene.add(backWall);

// Left Wall
const leftWall = new THREE.Mesh(
  new THREE.PlaneGeometry(roomDepth, screenHeight), // depth x height
  new THREE.MeshBasicMaterial({ color: 0x9999ff, side: THREE.DoubleSide })
);
leftWall.position.x = -screenWidth/2;
leftWall.position.z = -roomDepth/2;
leftWall.rotation.y = Math.PI / 2;
scene.add(leftWall);

// Right Wall
const rightWall = new THREE.Mesh(
  new THREE.PlaneGeometry(roomDepth, screenHeight),
  new THREE.MeshBasicMaterial({ color: 0xffcc99, side: THREE.DoubleSide })
);
rightWall.position.x = screenWidth/2;
rightWall.position.z = -roomDepth/2;
rightWall.rotation.y = -Math.PI / 2;
scene.add(rightWall);

const camera = new THREE.PerspectiveCamera(
  75, 
  window.innerWidth / window.innerHeight, 
  0.1, 
  20
);

// --- MediaPipe ---
const videoElement = document.querySelector('.input_video');
const mpFaceMesh = window
const faceMesh = new mpFaceMesh.FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`
});

faceMesh.setOptions({ selfieMode: true, refineLandmarks: true, maxNumFaces: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.8 });
// Add these outside the onResults function
let smoothEye = { x: 0, y: 0 };      // smoothed relative eye offsets
const smoothing = 0.2;                // between 0 (no smoothing) and 1 (very slow)

faceMesh.onResults(results => {
    const lm = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
    if (!lm) return;

    const leftEye = lm[33], rightEye = lm[263];

    const eyeCenter = {
        x: (leftEye.x + rightEye.x)/2 - 0.5,
        y: -(leftEye.y + rightEye.y)/2 + 0.5,
        z: -(leftEye.z + rightEye.z)/2
    };

    if (!neutralEye) neutralEye = { ...eyeCenter };

    const relEye = {
        x: eyeCenter.x - neutralEye.x,
        y: eyeCenter.y - neutralEye.y,
        z: eyeCenter.z - neutralEye.z
    };

    const IPD = 0.065; 
    const dx = rightEye.x - leftEye.x;
    const dy = rightEye.y - leftEye.y;
    const dz = rightEye.z - leftEye.z;
    const pixelDistance = Math.sqrt(dx*dx + dy*dy + dz*dz);
    const scale = IPD / pixelDistance;

    let eyeX = relEye.x * scale * 1.5;
    let eyeY = relEye.y * scale * 0.5;

    // clamp
    const maxX = (screenWidth / 2) - 0.001;
    const maxY = (screenHeight / 2) - 0.001;
    eyeX = Math.max(-maxX * eyeDistanceToScreen / roomDepth, Math.min(maxX * eyeDistanceToScreen / roomDepth, eyeX));
    eyeY = Math.max(-maxY * eyeDistanceToScreen / roomDepth, Math.min(maxY * eyeDistanceToScreen / roomDepth, eyeY));

    // --- Smooth the values ---
    smoothEye.x += (eyeX - smoothEye.x) * (1 - smoothing);
    smoothEye.y += (eyeY - smoothEye.y) * (1 - smoothing);

    const left   = (-screenWidth/2  - smoothEye.x) * camera.near / eyeDistanceToScreen;
    const right  = ( screenWidth/2  - smoothEye.x) * camera.near / eyeDistanceToScreen;
    const bottom = (-screenHeight/2 - smoothEye.y) * camera.near / eyeDistanceToScreen;
    const top    = ( screenHeight/2 - smoothEye.y) * camera.near / eyeDistanceToScreen;

    camera.projectionMatrix.makePerspective(left, right, top, bottom, camera.near, camera.far);
    camera.position.set(smoothEye.x, smoothEye.y, 0);
    camera.lookAt(smoothEye.x, smoothEye.y, -roomDepth);
});

const cameraMP = new mpFaceMesh.Camera(videoElement, {
    onFrame: async () => await faceMesh.send({image: videoElement}),
    width: 640,
    height: 480
});
cameraMP.start();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();