import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { storage } from '../../utils/storage';

export default function GuruPanelRekap() {
  const [students, setStudents] = useState([]);
  const [dates, setDates] = useState([]);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  useEffect(() => {
    loadRekap();
  }, []);

  const loadRekap = async () => {
    setLoading(true);
    const rStu = await storage.get('students');
    const stus = rStu ? JSON.parse(rStu) : [];
    setStudents(stus);

    const keys = await storage.list('attendance:');
    const attDates = keys.map(k => k.replace('attendance:', '')).sort();
    setDates(attDates);

    const calcTotals = {};
    stus.forEach(s => { calcTotals[s.id] = { H: 0, S: 0, I: 0, A: 0 }; });

    for (const dstr of attDates) {
      const attStr = await storage.get('attendance:' + dstr);
      const att = attStr ? JSON.parse(attStr) : {};
      
      Object.keys(att).forEach(stuId => {
        const r = att[stuId];
        if (calcTotals[stuId] && r?.status && calcTotals[stuId].hasOwnProperty(r.status)) {
          calcTotals[stuId][r.status]++;
        }
      });
    }
    setTotals(calcTotals);
    setLoading(false);
  };

  const csvEscape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const handleExportCsv = async () => {
    if (dates.length === 0 || students.length === 0) {
      showToast('Belum ada data untuk diunduh');
      return;
    }

    const attByDate = {};
    for (const d of dates) {
      const attStr = await storage.get('attendance:' + d);
      attByDate[d] = attStr ? JSON.parse(attStr) : {};
    }

    let csv = 'Nama,NIS,' + dates.join(',') + '\n';
    students.forEach(s => {
      const row = [csvEscape(s.name), csvEscape(s.nis || '')];
      dates.forEach(d => {
        const r = attByDate[d][s.id];
        row.push(r?.status ? r.status : (r?.pending ? 'Menunggu' : ''));
      });
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };
    
    a.href = url;
    a.download = `absensi_rekap_${todayStr()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('CSV diunduh');
  };

  const fmtDateLong = (dstr) => {
    try {
      return new Date(dstr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dstr;
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <span className="field-label">Rekap Keseluruhan</span>
          <div className="note" style={{ margin: 0, color: 'var(--text-primary)' }}>
            {dates.length > 0 ? (
              `${dates.length} hari tercatat \u00B7 ${fmtDateLong(dates[0])} s.d. ${fmtDateLong(dates[dates.length - 1])}`
            ) : (
              'Belum ada data'
            )}
          </div>
        </div>
        <Button variant="ghost" onClick={handleExportCsv}>Unduh CSV</Button>
      </Card>

      <Card style={{ overflowX: 'auto', padding: 0 }}>
        {loading ? (
          <div className="empty">Memuat rekap...</div>
        ) : dates.length === 0 || students.length === 0 ? (
          <div className="empty"><b>Belum ada rekap</b>Isi absensi dulu di tab "Absensi".</div>
        ) : (
          <table className="recap" style={{ minWidth: 500 }}>
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Nama</th>
                <th className="num">H</th>
                <th className="num">S</th>
                <th className="num">I</th>
                <th className="num">A</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const t = totals[s.id] || { H: 0, S: 0, I: 0, A: 0 };
                return (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 20, fontWeight: 500 }}>{s.name}</td>
                    <td className="num" style={{ color: 'var(--present)' }}>{t.H}</td>
                    <td className="num" style={{ color: 'var(--sick)' }}>{t.S}</td>
                    <td className="num" style={{ color: 'var(--izin)' }}>{t.I}</td>
                    <td className="num" style={{ color: 'var(--alpa)' }}>{t.A}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
