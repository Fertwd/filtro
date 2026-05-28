const videoElement = document.getElementById('input-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');

const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const activeControls = document.getElementById('active-controls');
const captureBtn = document.getElementById('capture-btn');

let faceMesh;
let camera;
let hatImage = new Image();
let logoImage = new Image();
let isSystemReady = false;
let particles = [];

function initApp() {
    document.getElementById('event-title').innerText = APP_CONFIG.evento.titulo;
    document.getElementById('event-name').innerText = APP_CONFIG.evento.nombreFestejado;
    document.getElementById('start-btn').innerText = APP_CONFIG.ui.textoBoton;
    document.getElementById('watermark-text').innerText = APP_CONFIG.ui.marcaAgua;
    
    hatImage.src = APP_CONFIG.assets.gorrito;
    logoImage.src = APP_CONFIG.assets.logo;
    
    if (APP_CONFIG.ui.habilitarParticulas) {
        createParticles();
    }
}

function createParticles() {
    for (let i = 0; i < 25; i++) {
        particles.push({
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            size: Math.random() * 3 + 1,
            speedY: Math.random() * 1 + 0.5,
            opacity: Math.random() * 0.5 + 0.2,
            angle: Math.random() * 360
        });
    }
}

function drawParticles(ctx, width, height) {
    ctx.save();
    particles.forEach(p => {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        
        p.y += p.speedY;
        if (p.y > height) {
            p.y = -10;
            p.x = Math.random() * width;
        }
    });
    ctx.restore();
}

function onResults(results) {
    if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.save();
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        results.multiFaceLandmarks.forEach(landmarks => {
            const topHead = landmarks[10];
            const chin = landmarks[152];
            const leftTarget = landmarks[234];
            const rightTarget = landmarks[454];

            const scaleX = canvasElement.width;
            const scaleY = canvasElement.height;

            const headWidth = Math.hypot(
                (rightTarget.x - leftTarget.x) * scaleX,
                (rightTarget.y - leftTarget.y) * scaleY
            );

            const hatWidth = headWidth * 1.6;
            const hatHeight = hatWidth * (hatImage.height / hatImage.width);

            const angle = Math.atan2(
                (rightTarget.y - leftTarget.y) * scaleY,
                (rightTarget.x - leftTarget.x) * scaleX
            );

            const centerX = topHead.x * scaleX;
            const centerY = topHead.y * scaleY;

            canvasCtx.save();
            canvasCtx.translate(centerX, centerY);
            canvasCtx.rotate(-angle);
            
            canvasCtx.drawImage(
                hatImage,
                -hatWidth / 2,
                -hatHeight + (hatHeight * 0.15),
                hatWidth,
                hatHeight
            );
            canvasCtx.restore();
        });
    }

    if (APP_CONFIG.ui.habilitarParticulas) {
        drawParticles(canvasCtx, canvasElement.width, canvasElement.height);
    }
}

async function startCamera() {
    startScreen.classList.add('hidden');
    activeControls.classList.remove('hidden');

    faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 4,
        refineLandmarks: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    faceMesh.onResults(onResults);

    camera = new Camera(videoElement, {
        onFrame: async () => {
            await faceMesh.send({ image: videoElement });
        },
        width: 720,
        height: 1280
    });

    await camera.start();
}

function capturePhoto() {
    canvasCtx.save();
    canvasCtx.drawImage(logoImage, 25, 25, 120, 120 * (logoImage.height / logoImage.width));
    
    canvasCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
    canvasCtx.font = "bold 14px 'Poppins', sans-serif";
    canvasCtx.letterSpacing = "2px";
    canvasCtx.fillText(APP_CONFIG.evento.nombreFestejado, 25, canvasElement.height - 30);
    canvasCtx.restore();

    const dataUrl = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${APP_CONFIG.evento.nombreFestejado.replace(/\s+/g, '_')}_photobooth.png`;
    link.href = dataUrl;
    link.click();
}

startBtn.addEventListener('click', startCamera);
captureBtn.addEventListener('click', capturePhoto);

window.addEventListener('DOMContentLoaded', initApp);