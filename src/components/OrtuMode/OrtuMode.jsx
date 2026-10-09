import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Lightbox } from '../UI/Lightbox';
import { supabase } from '../../lib/supabase';

const STATUS_LABEL = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa', E: 'Eskul' };
const STATUS_CLASS = { H: 'h', S: 's', I: 'i', A: 'a', E: 'e' };
const REFRESH_MS = 60000;

const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const fmtDate = (dstr) =>
  new Date(dstr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });

export default function OrtuMode({ code: initialCode }) {
  const [code, setCode] = useState(initialCode || '');
  const [codeInput, setCodeInput] = useState('');
  const [student, setStudent] = useState(null);
  const [state, setState] = useState(initialCode ? 'loading' : 'need-code'); // need-code, loading, invalid, error, ready
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));
  const [records, setRecords] = useState([]);
  const [violations, setViolations] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [lightbox, setLightbox] = useState({ show: false, imgData: null, meta: '' });

  useEffect(() => {
    if (!code) return;
    setState('loading');
    supabase
      .from('students')
      .select('id, name, nis')
      .eq('parent_code', code)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setState('error');
        else if (!data) setState('invalid');
        else {
          setStudent(data);
          setState('ready');
        }
      });
  }, [code]);

  const loadRecords = useCallback(async () => {
    if (!student) return;
    const { data, error } = await supabase
      .from('attendance')
      .select('date, status, time, pending, within_radius, distance, self_checkin, selfie_url')
      .eq('student_id', student.id)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: false });
    if (error) return;
    setRecords(data || []);

    const { data: vioData } = await supabase
      .from('violations')
      .select('date, type')
      .eq('student_id', student.id)
      .gte('date', `${month}-01`)
      .lte('date', `${month}-31`)
      .order('date', { ascending: false });
    setViolations(vioData || []);
    const d = new Date();
    setUpdatedAt(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  }, [student, month]);

  // Muat ulang berkala dan saat halaman dibuka kembali
  useEffect(() => {
    loadRecords();
    const timer = setInterval(loadRecords, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) loadRecords(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadRecords]);

  const submitCode = () => {
    const c = codeInput.trim().toUpperCase();
    if (c) setCode(c);
  };

  if (state !== 'ready') {
    return (
      <div style={{ maxWidth: 420, margin: '0 auto' }}>
        <Card style={{ padding: '32px 24px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, marginBottom: 8, color: 'var(--text-primary)' }}>Pantau Anak</h2>
          {state === 'loading' ? (
            <div style={{ padding: '16px 0' }}>
              <span className="spin" style={{ marginRight: 8 }}></span>Memuat data...
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Masukkan kode orang tua yang diberikan wali kelas.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 300, margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Kode orang tua"
                  value={codeInput}
                  onChange={e => setCodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitCode()}
                  style={{ fontSize: 20, padding: 16, textAlign: 'center', letterSpacing: '2px', borderRadius: 16, textTransform: 'uppercase' }}
                />
                <Button onClick={submitCode} style={{ padding: 16, fontSize: 16, borderRadius: 16 }}>Lihat Absensi</Button>
              </div>
              {state === 'invalid' && (
                <div className="status-box err" style={{ marginTop: 24, justifyContent: 'center' }}>
                  Kode tidak dikenali. Minta link terbaru ke wali kelas.
                </div>
              )}
              {state === 'error' && (
                <div className="status-box err" style={{ marginTop: 24, justifyContent: 'center' }}>
                  Gagal memuat data. Periksa koneksi internet, lalu coba lagi.
                </div>
              )}
            </>
          )}
        </Card>
      </div>
    );
  }

  const today = todayStr();
  const isCurrentMonth = month === today.slice(0, 7);
  const todayRec = isCurrentMonth ? records.find(r => r.date === today) : null;

  const counts = { H: 0, S: 0, I: 0, A: 0, E: 0 };
  records.forEach(r => {
    if (!r.pending && counts[r.status] !== undefined) counts[r.status]++;
  });

  const openSelfie = (r) =>
    setLightbox({ show: true, imgData: r.selfie_url, meta: `${student.name} · ${r.date} ${r.time || ''}` });

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ textAlign: 'center', padding: '16px 0 24px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pantauan Orang Tua</div>
        <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 24, fontWeight: 600, marginTop: 4 }}>{student.name}</div>
        {student.nis && <div className="stu-nis">NISN {student.nis}</div>}
      </div>

      {isCurrentMonth && (
        <Card style={{ marginBottom: 16 }}>
          <span className="field-label">Hari Ini &middot; {fmtDate(today)}</span>
          {!todayRec ? (
            <div className="status-box warn" style={{ marginBottom: 0 }}>Belum ada catatan absen hari ini.</div>
          ) : todayRec.pending ? (
            <div className="status-box warn" style={{ marginBottom: 0 }}>
              Absen pukul {todayRec.time || '-'} dari luar area sekolah
              {todayRec.distance != null ? ` (±${Math.round(todayRec.distance)} m)` : ''}. Menunggu verifikasi guru.
            </div>
          ) : (
            <div className={`status-box ${todayRec.status === 'A' ? 'err' : todayRec.status === 'H' || todayRec.status === 'E' ? 'ok' : 'info'}`} style={{ marginBottom: 0 }}>
              <div>
                Tercatat <b>{STATUS_LABEL[todayRec.status] || todayRec.status}</b>
                {todayRec.time ? ` pukul ${todayRec.time}` : ''}
                {todayRec.self_checkin ? ' (absen mandiri dengan selfie)' : ' (dicatat guru)'}.
              </div>
            </div>
          )}
          {todayRec?.selfie_url && (
            <button className="thumb-btn" onClick={() => openSelfie(todayRec)} style={{ marginTop: 12 }}>
              <img src={todayRec.selfie_url} alt="Selfie absen hari ini" />
            </button>
          )}
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <span className="field-label">Bulan</span>
            <input type="month" value={month} max={today.slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} />
          </div>
          <Button variant="ghost" size="sm" onClick={loadRecords}>Muat Ulang</Button>
        </div>
        {updatedAt && <div className="note">Diperbarui pukul {updatedAt}, otomatis tiap 1 menit.</div>}
      </Card>

      <div className="summary">
        {Object.keys(counts).map(k => (
          <div key={k} className={`chip ${STATUS_CLASS[k]}`}>
            <div className="num">{counts[k]}</div>
            <div className="lbl">{STATUS_LABEL[k]}</div>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <span className="field-label">Pelanggaran</span>
        {violations.length === 0 ? (
          <div className="status-box ok" style={{ marginBottom: 0 }}>Tidak ada pelanggaran pada bulan ini.</div>
        ) : (
          <>
            <div className="status-box err">{violations.length} pelanggaran pada bulan ini.</div>
            {[...new Set(violations.map(v => v.date))].map(d => (
              <div key={d} className="roster-row">
                <span className="stu-name">{fmtDate(d)}</span>
                <div className="note" style={{ margin: '4px 0 0' }}>
                  {violations.filter(v => v.date === d).map(v => v.type).join(', ')}
                </div>
              </div>
            ))}
          </>
        )}
      </Card>

      <Card>
        {records.length === 0 ? (
          <div className="empty"><b>Belum ada catatan</b>Tidak ada data absensi pada bulan ini.</div>
        ) : (
          records.map(r => (
            <div key={r.date} className="roster-row">
              <div className="roster-main">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <span className="stu-name">{fmtDate(r.date)}</span>
                  <div className="note" style={{ margin: '4px 0 0' }}>
                    {r.pending
                      ? `Menunggu verifikasi guru · ${r.time || '-'}`
                      : `${STATUS_LABEL[r.status] || r.status || '-'}${r.time ? ` · ${r.time}` : ''}`}
                  </div>
                </div>
                <div className="rocker">
                  <button className={r.pending ? '' : `on ${STATUS_CLASS[r.status] || ''}`} style={{ cursor: 'default' }}>
                    {r.pending ? '?' : r.status}
                  </button>
                </div>
              </div>
              {r.selfie_url && (
                <button className="thumb-btn" onClick={() => openSelfie(r)}>
                  <img src={r.selfie_url} alt={`Selfie ${r.date}`} />
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      <Lightbox
        show={lightbox.show}
        imgData={lightbox.imgData}
        metaText={lightbox.meta}
        onClose={() => setLightbox({ show: false, imgData: null, meta: '' })}
      />
    </div>
  );
}
