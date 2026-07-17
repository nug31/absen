import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { Lightbox } from '../UI/Lightbox';
import { useToast } from '../UI/Toast';
import { storage } from '../../utils/storage';

const STATUS = ['H', 'S', 'I', 'A'];
const STATUS_LABEL = { H: 'Hadir', S: 'Sakit', I: 'Izin', A: 'Alpa' };
const STATUS_CLASS = { H: 'h', S: 's', I: 'i', A: 'a' };

export default function GuruPanelAbsen() {
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selfies, setSelfies] = useState({});
  const [lightbox, setLightbox] = useState({ show: false, imgData: null, meta: '' });
  const showToast = useToast();

  useEffect(() => {
    loadData();
  }, [dateStr]);

  const loadData = async () => {
    const rStu = await storage.get('students');
    const stus = rStu ? JSON.parse(rStu) : [];
    setStudents(stus);

    const rAtt = await storage.get('attendance:' + dateStr);
    const att = rAtt ? JSON.parse(rAtt) : {};
    setAttendance(att);

    const newSelfies = {};
    for (const s of stus) {
      if (att[s.id]?.selfCheckin) {
        const photo = await storage.get('selfie:' + dateStr + ':' + s.id);
        if (photo) newSelfies[s.id] = photo;
      }
    }
    setSelfies(newSelfies);
  };

  const computeCounts = () => {
    const c = { H: 0, S: 0, I: 0, A: 0, P: 0 };
    students.forEach(s => {
      const r = attendance[s.id];
      if (r?.pending) c.P++;
      else if (r?.status && c.hasOwnProperty(r.status)) c[r.status]++;
    });
    const done = c.H + c.S + c.I + c.A + c.P;
    const belum = students.length - done;
    return { ...c, belum };
  };

  const handleMarkAllHadir = async () => {
    if (students.length === 0) return;
    const newAtt = { ...attendance };
    const nowTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
    
    students.forEach(s => {
      if (!newAtt[s.id] || !newAtt[s.id].status) {
        newAtt[s.id] = { status: 'H', time: nowTime, distance: null, withinRadius: null, pending: false, selfCheckin: false };
      }
    });
    
    await storage.set('attendance:' + dateStr, JSON.stringify(newAtt));
    setAttendance(newAtt);
    showToast('Siswa tanpa catatan ditandai Hadir');
  };

  const handleStatusToggle = async (stuId, status) => {
    const newAtt = { ...attendance };
    const existing = newAtt[stuId];
    
    if (existing?.status === status) {
      delete newAtt[stuId];
    } else {
      const nowTime = `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`;
      newAtt[stuId] = {
        ...existing,
        status,
        time: existing?.time || nowTime,
        pending: false
      };
    }
    
    await storage.set('attendance:' + dateStr, JSON.stringify(newAtt));
    setAttendance(newAtt);
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
        {students.length === 0 ? (
          <div className="empty"><b>Belum ada siswa</b>Tambahkan daftar siswa di tab "Kelola Siswa".</div>
        ) : (
          <div>
            {students.map(s => {
              const rec = attendance[s.id];
              const st = rec?.status || '';
              const photo = selfies[s.id];
              
              return (
                <div key={s.id} className="roster-row">
                  <div className="roster-main">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <span className="stu-name">{s.name}</span>
                      {s.nis && <span className="stu-nis">NISN {s.nis}</span>}
                      {rec?.pending && (
                        <div className="pending-badge">
                          Menunggu verifikasi &middot; &plusmn;{Math.round(rec.distance)} m &middot; {rec.time}
                        </div>
                      )}
                      {rec?.selfCheckin && !rec.pending && (
                        <div className="note" style={{ margin: '6px 0 0' }}>
                          Check-in mandiri pukul {rec.time} {rec.distance != null ? `\u00B7 \u00B1${Math.round(rec.distance)} m` : ''}
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
                    </div>
                  </div>
                  
                  {photo && (
                    <button 
                      className="thumb-btn" 
                      onClick={() => setLightbox({ 
                        show: true, 
                        imgData: photo, 
                        meta: `${s.name} \u00B7 ${dateStr} ${rec?.time||''} ${rec?.distance != null ? `\u00B7 \u00B1${Math.round(rec.distance)}m` : ''}` 
                      })}
                    >
                      <img src={photo} alt={`Foto ${s.name}`} />
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
