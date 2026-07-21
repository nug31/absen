import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { haversine, getCurrentLocation } from '../../utils/geo';
import { supabase } from '../../lib/supabase';
import defaultStudents from '../../data/defaultStudents';

export default function SiswaMode() {
  const [nis, setNis] = useState('');
  const [matchedStudent, setMatchedStudent] = useState(null);
  const [checkinState, setCheckinState] = useState('idle'); // idle, checking, checked-in, waiting-camera, camera-ready, uploading
  const [attendanceRecord, setAttendanceRecord] = useState(null);
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
      // Cari siswa dari Supabase
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .ilike('nis', nis.trim())
        .single();

      let found = null;
      if (!error && data) {
        found = data;
      } else {
        // Fallback ke defaultStudents jika tabel Supabase masih kosong
        found = defaultStudents.find(
          s => s.nis && s.nis.toLowerCase() === nis.trim().toLowerCase()
        );

        if (found) {
          // Upsert siswa ke Supabase agar FK attendance tidak gagal
          await supabase
            .from('students')
            .upsert({ id: found.id, name: found.name, nis: found.nis }, { onConflict: 'id' });
        }
      }

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

    const { data: rec } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', student.id)
      .eq('date', today)
      .single();

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
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
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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

  // Upload foto base64 ke Supabase Storage
  const uploadSelfie = async (dataUrl, studentId, date) => {
    try {
      const base64 = dataUrl.split(',')[1];
      const byteString = atob(base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/jpeg' });

      const filePath = `selfies/${date}/${studentId}.jpg`;
      const { error } = await supabase.storage
        .from('absenio')
        .upload(filePath, blob, { upsert: true, contentType: 'image/jpeg' });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('absenio').getPublicUrl(filePath);
      return urlData?.publicUrl || null;
    } catch (e) {
      console.warn('Upload selfie gagal, lanjut tanpa foto:', e.message);
      return null;
    }
  };

  const submitCheckin = async () => {
    setCheckinState('uploading');
    setCameraError('');

    // Ambil konfigurasi sekolah
    let cfg = {};
    try {
      const { data: cfgRows } = await supabase.from('config').select('key, value');
      if (cfgRows) cfgRows.forEach(r => { cfg[r.key] = r.value; });
    } catch (e) { }

    // Ambil GPS
    let coords = null;
    try {
      coords = await getCurrentLocation();
    } catch (e) {
      setCameraError('Tidak bisa mengambil lokasi. Pastikan izin lokasi diaktifkan.');
      setCheckinState('photo-captured');
      return;
    }

    // Upload foto selfie
    const today = todayStr();
    const selfieUrl = await uploadSelfie(capturedPhoto, matchedStudent.id, today);

    let record;
    const schoolLat = parseFloat(cfg.schoolLat);
    const schoolLng = parseFloat(cfg.schoolLng);
    const radius = parseInt(cfg.radius) || 200;

    if (!isNaN(schoolLat) && !isNaN(schoolLng)) {
      const dist = haversine(coords.lat, coords.lng, schoolLat, schoolLng);
      const within = dist <= radius;
      record = {
        student_id: matchedStudent.id,
        date: today,
        status: within ? 'H' : null,
        time: nowTime(),
        distance: dist,
        within_radius: within,
        pending: !within,
        self_checkin: true,
        lat: coords.lat,
        lng: coords.lng,
        selfie_url: selfieUrl,
      };
    } else {
      record = {
        student_id: matchedStudent.id,
        date: today,
        status: 'H',
        time: nowTime(),
        distance: null,
        within_radius: null,
        pending: false,
        self_checkin: true,
        lat: coords.lat,
        lng: coords.lng,
        selfie_url: selfieUrl,
      };
    }

    // Upsert ke Supabase
    const { data: saved, error } = await supabase
      .from('attendance')
      .upsert(record, { onConflict: 'student_id,date' })
      .select()
      .single();

    if (error) {
      setCameraError('Gagal menyimpan absensi: ' + error.message);
      setCheckinState('photo-captured');
      return;
    }

    setAttendanceRecord(saved);
    if (saved.pending) {
      setCheckinState('pending-verification');
      showToast('Absen menunggu verifikasi guru');
    } else {
      setCheckinState('checked-in');
      showToast('Absen tersimpan ✓');
    }
  };

  const getStatusLabel = (code) => {
    return { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' }[code] || code;
  };

  return (
    <div style={{ maxWidth: 420, margin: '0 auto' }}>
      {checkinState === 'idle' || checkinState === 'not-found' ? (
        <Card style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👋</div>
            <h2 style={{ fontSize: 24, marginBottom: 8, color: 'var(--text-primary)' }}>Absen Masuk</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Silakan masukkan NISN Anda untuk melanjutkan</p>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: 300, margin: '0 auto' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Ketik NISN..."
              value={nis}
              onChange={e => setNis(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNisSubmit()}
              style={{ 
                fontSize: 20, 
                padding: '16px', 
                textAlign: 'center', 
                letterSpacing: '2px',
                borderRadius: '16px',
                backgroundColor: 'rgba(15,23,42,0.8)',
                border: '2px solid var(--surface-border)'
              }}
            />
            <Button onClick={handleNisSubmit} style={{ padding: '16px', fontSize: 16, borderRadius: '16px' }}>Lanjutkan</Button>
          </div>
          
          {checkinState === 'not-found' && (
            <div className="status-box err" style={{ marginTop: 24, justifyContent: 'center' }}>
              NISN "{nis}" tidak ditemukan.
            </div>
          )}
        </Card>
      ) : (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Halo</div>
            <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 26, fontWeight: 600, marginTop: 4 }}>{matchedStudent?.name}</div>
          </div>

          {checkinState === 'checking' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <span className="spin" style={{ display: 'inline-block', marginRight: 8 }}></span>Memeriksa status...
            </div>
          )}

          {checkinState === 'checked-in' && (
            <div className="status-box ok">
              <div>Kamu sudah tercatat <b>{getStatusLabel(attendanceRecord.status)}</b> hari ini pukul {attendanceRecord.time || '-'}.</div>
            </div>
          )}

          {checkinState === 'pending-verification' && (
            <div className="status-box warn">
              <div>Absen kamu (pukul {attendanceRecord.time || '-'}) tercatat di luar radius sekolah (±{Math.round(attendanceRecord.distance)} m) dan sedang menunggu verifikasi guru.</div>
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
            <Button variant="ghost" size="sm" onClick={() => { stopCamera(); setCheckinState('idle'); setMatchedStudent(null); }}>Kembali</Button>
          </div>
        </div>
      )}
    </div>
  );
}
