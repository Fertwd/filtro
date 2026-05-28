const videoElement = document.getElementById('input-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const cameraControls = document.getElementById('camera-controls');
const captureBtn = document.getElementById('capture-btn');
const flashOverlay = document.getElementById('flash-overlay');

const previewScreen = document.getElementById('preview-screen');
const previewImage = document.getElementById('preview-image');
const retakeBtn = document.getElementById('retake-btn');
const saveBtn = document.getElementById('save-btn');

let hatImage = new Image();
let logoImage = new Image();
let particles = [];
let videoWidth = 0;
let videoHeight = 0;
let currentPhotoDataUrl = null;

function init() {
    document.getElementById('event-name').innerText = APP_CONFIG.evento.nombreFestejado;

    hatImage.src = APP_CONFIG.assets.gorrito;
    logoImage.src = APP_CONFIG.assets.logo;

    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random(),
            y: Math.random(),
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.005 + 0.002,
            alpha: Math.random() * 0.5 + 0.3
        });
    }
}

function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}

function drawParticles() {
    particles.forEach(p => {
        canvasCtx.fillStyle = `rgba(255,255,255,${p.alpha})`;
        canvasCtx.beginPath();
        canvasCtx.arc(
            p.x * canvasElement.width,
            p.y * canvasElement.height,
            p.size,
            0,
            Math.PI * 2
        );
        canvasCtx.fill();

        p.y += p.speed;
        if (p.y > 1) {
            p.y = 0;
            p.x = Math.random();
        }
    });
}

/* 🔥 CONVERSIÓN CORRECTA DE COORDENADAS */
function convertX(x) {
    return (1 - x) * videoWidth;
}

function convertY(y) {
    return y * videoHeight;
}

function onResults(results) {
    resizeCanvas();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (!results.image) return;

    videoWidth = results.image.width;
    videoHeight = results.image.height;

    const scale = Math.max(
        canvasElement.width / videoWidth,
        canvasElement.height / videoHeight
    );

    const drawWidth = videoWidth * scale;
    const drawHeight = videoHeight * scale;
    const offsetX = (canvasElement.width - drawWidth) / 2;
    const offsetY = (canvasElement.height - drawHeight) / 2;

    // 🎥 VIDEO
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    canvasCtx.drawImage(
        results.image,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
    );

    canvasCtx.restore();

    // 🎩 FACE FILTER
    if (results.multiFaceLandmarks) {
        results.multiFaceLandmarks.forEach(landmarks => {

            const topHead = landmarks[10];
            const leftEar = landmarks[234];
            const rightEar = landmarks[454];

            // 🔥 COORDENADAS BIEN A ESCALA REAL
            const lx = convertX(leftEar.x) * (drawWidth / videoWidth) + offsetX;
            const rx = convertX(rightEar.x) * (drawWidth / videoWidth) + offsetX;

            const ly = convertY(leftEar.y) * (drawHeight / videoHeight) + offsetY;
            const ry = convertY(rightEar.y) * (drawHeight / videoHeight) + offsetY;

            const cx = convertX(topHead.x) * (drawWidth / videoWidth) + offsetX;
            const cy = convertY(topHead.y) * (drawHeight / videoHeight) + offsetY;

            const headWidth = Math.hypot(rx - lx, ry - ly);

            const hatWidth = headWidth * 1.4;
            const hatHeight = hatWidth * (hatImage.height / hatImage.width);

            const angle = Math.atan2(ry - ly, rx - lx);

            // 🔥 POSICIÓN SEGURA (NO SE SALE)
            const verticalOffset = hatHeight * 0.6;

            canvasCtx.save();
            canvasCtx.translate(cx, cy - verticalOffset);
            canvasCtx.rotate(-angle);

            canvasCtx.drawImage(
                hatImage,
                -hatWidth / 2,
                -hatHeight,
                hatWidth,
                hatHeight
            );

            canvasCtx.restore();
        });
    }

    drawParticles();
}

async function startCamera() {
    startScreen.classList.add('hidden');
    cameraControls.classList.remove('hidden');

    const faceMesh = new FaceMesh({
        locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 4,
        refineLandmarks: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    faceMesh.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 1280,
        height: 720,
        facingMode: "user"
    });

    await camera.start();
}

function capturePhoto() {
    flashOverlay.classList.add('flash-active');
    setTimeout(() => flashOverlay.classList.remove('flash-active'), 150);

    canvasCtx.drawImage(
        logoImage,
        (canvasElement.width - 100) / 2,
        20,
        100,
        100
    );

    canvasCtx.fillStyle = "#fff";
    canvasCtx.font = "800 18px Poppins";
    canvasCtx.textAlign = "center";

    canvasCtx.fillText(
        `✨ ${APP_CONFIG.evento.nombreFestejado} ✨`,
        canvasElement.width / 2,
        canvasElement.height - 40
    );

    currentPhotoDataUrl = canvasElement.toDataURL("image/jpeg", 0.95);

    previewImage.src = currentPhotoDataUrl;
    cameraControls.classList.add('hidden');
    previewScreen.classList.remove('hidden');
}

retakeBtn.addEventListener('click', () => {
    previewScreen.classList.add('hidden');
    cameraControls.classList.remove('hidden');
});

saveBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `EclipseMotion_${Date.now()}.jpg`;
    link.href = currentPhotoDataUrl;
    link.click();

    previewScreen.classList.add('hidden');
    cameraControls.classList.remove('hidden');
});

startBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', capturePhoto);

window.addEventListener('DOMContentLoaded', init);