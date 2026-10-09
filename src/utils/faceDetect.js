// Deteksi wajah di browser (MediaPipe BlazeFace). Foto tidak dikirim ke mana pun untuk dicek.
const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';

const MIN_FACE_WIDTH = 0.2; // lebar wajah minimal terhadap lebar frame

let detectorPromise = null;
let detector = null;

export function loadFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.6,
      });
      return detector;
    })().catch((e) => {
      detectorPromise = null; // supaya bisa dicoba lagi
      throw e;
    });
  }
  return detectorPromise;
}

// Periksa frame video saat ini. Hasil: { ok, msg }
export function checkFace(video) {
  if (!detector || !video || video.readyState < 2 || !video.videoWidth) {
    return { ok: false, msg: 'Menyiapkan kamera...' };
  }
  let faces;
  try {
    faces = detector.detectForVideo(video, performance.now()).detections;
  } catch (e) {
    return { ok: false, msg: 'Gagal memeriksa wajah, coba lagi.' };
  }
  if (faces.length === 0) return { ok: false, msg: 'Wajah belum terlihat. Arahkan kamera ke wajahmu.' };
  if (faces.length > 1) return { ok: false, msg: 'Terdeteksi lebih dari satu wajah. Selfie harus sendiri.' };
  if (faces[0].boundingBox.width / video.videoWidth < MIN_FACE_WIDTH) {
    return { ok: false, msg: 'Wajah terlalu jauh. Dekatkan ke kamera.' };
  }
  return { ok: true, msg: 'Wajah terdeteksi ✓' };
}
