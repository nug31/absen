import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { storage } from '../../utils/storage';
import { haversine, getCurrentLocation } from '../../utils/geo';
import defaultStudents from '../../data/defaultStudents';

export default function SiswaMode() {
  const [nis, setNis] = useState('');
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [checkinState, setCheckinState] = useState('idle'); // idle, checking, checked-in, waiting-camera, camera-ready, uploading
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [config, setConfig] = useState({});
  const [cameraError, setCameraError] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  
  const videoRef = useRef(null);
  const showToast = useToast();

  const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };

  const nowTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  useEffect(() => {
    return () => stopCamera();
  }, [cameraStream]);

  const handleNisSubmit = async () => {
    if (!nis.trim()) {
      showToast('Masukkan NISN dulu');
      return;
    }
    try {
      const r = await storage.get('students');
      // Fallback ke defaultStudents jika localStorage kosong
      const students = (r ? JSON.parse(r) : null) || defaultStudents;
      const found = students.find(s => s.nis && s.nis.toLowerCase() === nis.trim().toLowerCase());
      if (!found) {
        setCheckinState('not-found');
        return;
      }
      setMatchedStudent(found);
      await loadCheckinStatus(found);
    } catch (e) {
      showToast('Gagal memuat data siswa');
    }
  };

  const loadCheckinStatus = async (student) => {
    setCheckinState('checking');
    const today = todayStr();
    const attStr = await storage.get('attendance:' + today);
    const att = attStr ? JSON.parse(attStr) : {};
    const rec = att[student.id];

    if (rec && rec.status) {
      setAttendanceRecord(rec);
      setCheckinState('checked-in');
    } else if (rec && rec.pending) {
      setAttendanceRecord(rec);
      setCheckinState('pending-verification');
    } else {
      setCheckinState('waiting-camera');
    }
  };

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      setCameraStream(stream);
      setCheckinState('camera-ready');
    } catch (e) {
      setCameraError(`Tidak bisa mengakses kamera (${e.name || 'error'}).`);
    }
  };

  useEffect(() => {
    if (checkinState === 'camera-ready' && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [checkinState, cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 320; canvas.height = 240;
    const ctx = canvas.getContext('2d');
    const vw = video.videoWidth || 320, vh = video.videoHeight || 240;
    const scale = Math.max(320/vw, 240/vh);
    const sw = 320/scale, sh = 240/scale;
    const sx = (vw-sw)/2, sy = (vh-sh)/2;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, 320, 240);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.55);
    setCapturedPhoto(dataUrl);
    stopCamera();
    setCheckinState('photo-captured');
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
  };

  const submitCheckin = async () => {
    setCheckinState('uploading');
    setCameraError('');

    let cfg = {};
    try {
      const cfgStr = await storage.get('config');
      if (cfgStr) cfg = JSON.parse(cfgStr);
    } catch (e) { }

    let coords = null;
    try {
      coords = await getCurrentLocation();
    } catch (e) {
      setCameraError('Tidak bisa mengambil lokasi. Pastikan izin lokasi diaktifkan.');
      setCheckinState('photo-captured');
      return;
    }

    const today = todayStr();
    const attStr = await storage.get('attendance:' + today);
    const att = attStr ? JSON.parse(attStr) : {};
    let record;

    if (cfg.schoolLat != null && cfg.schoolLng != null && !isNaN(parseFloat(cfg.schoolLat))) {
      const dist = haversine(coords.lat, coords.lng, parseFloat(cfg.schoolLat), parseFloat(cfg.schoolLng));
      const within = dist <= (cfg.radius || 200);
      if (within) {
        record = { status: 'H', time: nowTime(), distance: dist, withinRadius: true, pending: false, selfCheckin: true, lat: coords.lat, lng: coords.lng };
      } else {
        record = { time: nowTime(), distance: dist, withinRadius: false, pending: true, selfCheckin: true, lat: coords.lat, lng: coords.lng };
      }
      att[matchedStudent.id] = record;
      await storage.set('attendance:' + today, JSON.stringify(att));
      await storage.set('selfie:' + today + ':' + matchedStudent.id, capturedPhoto);
      
      setAttendanceRecord(record);
      if (within) {
        setCheckinState('checked-in');
        showToast('Absen tersimpan');
      } else {
        setCheckinState('pending-verification');
        showToast('Absen menunggu verifikasi');
      }
    } else {
      record = { status: 'H', time: nowTime(), distance: null, withinRadius: null, pending: false, selfCheckin: true, lat: coords.lat, lng: coords.lng };
      att[matchedStudent.id] = record;
      await storage.set('attendance:' + today, JSON.stringify(att));
      await storage.set('selfie:' + today + ':' + matchedStudent.id, capturedPhoto);
      
      setAttendanceRecord(record);
      setCheckinState('checked-in');
      showToast('Absen tersimpan');
    }
  };

  const getStatusLabel = (code) => {
    return { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' }[code] || code;
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {checkinState === 'idle' || checkinState === 'not-found' ? (
        <Card>
          <span className="field-label">Masukkan NISN</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              inputMode="numeric" 
              placeholder="Contoh: 0106090576" 
              value={nis} 
              onChange={e => setNis(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNisSubmit()}
              style={{ flex: 1, minWidth: 120 }}
            />
            <Button onClick={handleNisSubmit}>Cek</Button>
          </div>
          <div className="note">Ketik NISN kamu, sistem akan mencocokkan nama secara otomatis.</div>
          {checkinState === 'not-found' && (
            <div className="status-box err" style={{ marginTop: 12 }}>NISN "{nis}" tidak ditemukan di daftar kelas.</div>
          )}
        </Card>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Halo</div>
            <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 26, fontWeight: 600, marginTop: 4 }}>{matchedStudent?.name}</div>
          </div>

          {checkinState === 'checked-in' && (
            <div className="status-box ok">
              <div>Kamu sudah tercatat <b>{getStatusLabel(attendanceRecord.status)}</b> hari ini pukul {attendanceRecord.time || '-'}.</div>
            </div>
          )}

          {checkinState === 'pending-verification' && (
            <div className="status-box warn">
              <div>Absen kamu (pukul {attendanceRecord.time || '-'}) tercatat di luar radius sekolah (&plusmn;{Math.round(attendanceRecord.distance)} m) dan sedang menunggu verifikasi guru.</div>
            </div>
          )}

          {checkinState === 'waiting-camera' && (
            <>
              <div className="note" style={{ textAlign: 'center', marginBottom: 16 }}>Ambil selfie untuk absen hari ini. Pastikan izin kamera & lokasi diaktifkan.</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Button onClick={startCamera}>Buka Kamera</Button>
              </div>
            </>
          )}

          {checkinState === 'camera-ready' && (
            <>
              <div className="cam-wrap">
                <video ref={videoRef} autoPlay playsInline muted></video>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <Button onClick={capturePhoto}>Ambil Foto</Button>
              </div>
            </>
          )}

          {checkinState === 'photo-captured' && (
            <>
              <div className="cam-wrap">
                <img src={capturedPhoto} alt="Selfie" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                <Button variant="ghost" onClick={startCamera}>Ambil Ulang</Button>
                <Button onClick={submitCheckin}>Kirim Absen</Button>
              </div>
            </>
          )}

          {checkinState === 'uploading' && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button disabled><span className="spin" style={{ marginRight: 8 }}></span>Mengirim...</Button>
            </div>
          )}

          {cameraError && (
            <div className="status-box err" style={{ marginTop: 16 }}>{cameraError}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
            <Button variant="ghost" size="sm" onClick={() => setCheckinState('idle')}>Kembali</Button>
          </div>
        </div>
      )}
    </div>
  );
}
