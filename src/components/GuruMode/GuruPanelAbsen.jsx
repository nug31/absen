import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Lightbox } from '../UI/Lightbox';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';
import defaultStudents from '../../data/defaultStudents';

const STATUS = ['H', 'S', 'I', 'A'];
const STATUS_LABEL = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
const STATUS_CLASS = { H: 'h', S: 's', I: 'i', A: 'a' };

export default function GuruPanelAbsen() {
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({}); // { student_id: record }
  const [lightbox, setLightbox] = useState({ show: false, imgData: null, meta: '' });
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    loadData();
  }, [dateStr]);

  const loadData = async () => {
    setLoading(true);
    // Load siswa dari Supabase, fallback ke default
    const { data: stuData } = await supabase.from('students').select('*').order('name');
    const stus = (stuData && stuData.length > 0) ? stuData : defaultStudents;
    setStudents(stus);

    // Load absensi hari ini
    const { data: attData } = await supabase
      .from('attendance')
      .select('*')
      .eq('date', dateStr);

    const attMap = {};
    if (attData) attData.forEach(r => { attMap[r.student_id] = r; });
    setAttendance(attMap);
    setLoading(false);
  };

  const computeCounts = () => {
    const c = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    students.forEach(s => {
      const r = attendance[s.id];
      if (r?.pending) c.P++;
      else if (r?.status && c.hasOwnProperty(r.status)) c[r.status]++;
    });
    const done = c.H + c.S + c.I + c.A + c.P;
    return { ...c, belum: students.length - done };
  };

  const handleMarkAllHadir = async () => {
    if (students.length === 0) return;
    const nowTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;

    const toUpsert = students
      .filter(s => !attendance[s.id] || !attendance[s.id].status)
      .map(s => ({
        student_id: s.id,
        date: dateStr,
        status: 'H',
        time: nowTime,
        pending: false,
        self_checkin: false,
      }));

    if (toUpsert.length === 0) return;

    const { error } = await supabase
      .from('attendance')
      .upsert(toUpsert, { onConflict: 'student_id,date' });

    if (error) { showToast('Gagal: ' + error.message); return; }
    showToast('Siswa tanpa catatan ditandai Hadir');
    await loadData();
  };

  const handleReset = async (stuId) => {
    if (!window.confirm('Hapus data absensi siswa ini?')) return;
    const { error } = await supabase.from('attendance').delete()
      .eq('student_id', stuId).eq('date', dateStr);
      
    if (error) { showToast('Gagal menghapus: ' + error.message); return; }
    
    const newAtt = { ...attendance };
    delete newAtt[stuId];
    setAttendance(newAtt);
    showToast('Absensi dihapus');
  };

  const handleStatusToggle = async (stuId, status) => {
    const existing = attendance[stuId];

    if (existing?.status === status) {
      // Hapus record
      await supabase.from('attendance').delete()
        .eq('student_id', stuId).eq('date', dateStr);
      const newAtt = { ...attendance };
      delete newAtt[stuId];
      setAttendance(newAtt);
    } else {
      const nowTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
      const record = {
        student_id: stuId,
        date: dateStr,
        status,
        time: existing?.time || nowTime,
        pending: false,
        self_checkin: existing?.self_checkin || false,
        distance: existing?.distance || null,
        within_radius: existing?.within_radius || null,
        lat: existing?.lat || null,
        lng: existing?.lng || null,
        selfie_url: existing?.selfie_url || null,
      };

      const { data: saved, error } = await supabase
        .from('attendance')
        .upsert(record, { onConflict: 'student_id,date' })
        .select()
        .single();

      if (error) { showToast('Gagal: ' + error.message); return; }
      setAttendance(prev => ({ ...prev, [stuId]: saved }));
    }
  };

  const c = computeCounts();

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="field-label">Tanggal</span>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
          </div>
          <Button variant="ghost" onClick={handleMarkAllHadir}>Tandai Sisanya Hadir</Button>
        </div>
      </Card>

      <div className="summary">
        <div className="chip h"><div className="num">{c.H}</div><div className="lbl">Hadir</div></div>
        <div className="chip s"><div className="num">{c.S}</div><div className="lbl">Sakit</div></div>
        <div className="chip i"><div className="num">{c.I}</div><div className="lbl">Izin</div></div>
        <div className="chip a"><div className="num">{c.A}</div><div className="lbl">Alpa</div></div>
        <div className="chip p"><div className="num">{c.P}</div><div className="lbl">Verif</div></div>
        <div className="chip"><div className="num">{c.belum}</div><div className="lbl">Belum</div></div>
      </div>

      <Card>
        {loading ? (
          <div className="empty">Memuat data...</div>
        ) : students.length === 0 ? (
          <div className="empty"><b>Belum ada siswa</b>Tambahkan daftar siswa di tab "Kelola Siswa".</div>
        ) : (
          <div>
            {students.map(s => {
              const rec = attendance[s.id];
              const st = rec?.status || '';

              return (
                <div key={s.id} className="roster-row">
                  <div className="roster-main">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className="stu-name">{s.name}</span>
                      {s.nis && <span className="stu-nis">NISN {s.nis}</span>}
                      {rec?.pending && (
                        <div className="pending-badge">
                          Menunggu verifikasi &middot; ±{Math.round(rec.distance)} m &middot; {rec.time}
                        </div>
                      )}
                      {rec?.self_checkin && !rec.pending && (
                        <div className="note" style={{ margin: '6px 0 0' }}>
                          Check-in mandiri pukul {rec.time} {rec.distance != null ? `· ±${Math.round(rec.distance)} m` : ''}
                        </div>
                      )}
                    </div>

                    <div className="rocker">
                      {STATUS.map(code => (
                        <button
                          key={code}
                          className={st === code ? `on ${STATUS_CLASS[code]}` : ''}
                          onClick={() => handleStatusToggle(s.id, code)}
                          title={STATUS_LABEL[code]}
                        >
                          {code}
                        </button>
                      ))}
                      {rec && (
                        <button
                          onClick={() => handleReset(s.id)}
                          title="Hapus / Reset Absen"
                          style={{ color: '#ef4444', marginLeft: 4 }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {rec?.selfie_url && (
                    <button
                      className="thumb-btn"
                      onClick={() => setLightbox({
                        show: true,
                        imgData: rec.selfie_url,
                        meta: `${s.name} · ${dateStr} ${rec.time || ''} ${rec.distance != null ? `· ±${Math.round(rec.distance)}m` : ''}`
                      })}
                    >
                      <img src={rec.selfie_url} alt={`Foto ${s.name}`} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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
