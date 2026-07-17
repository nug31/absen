import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import defaultStudents from '../../data/defaultStudents';

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

    // Load siswa
    const { data: stuData } = await supabase.from('students').select('*').order('name');
    const stus = (stuData && stuData.length > 0) ? stuData : defaultStudents;
    setStudents(stus);

    // Load semua attendance
    const { data: attData } = await supabase
      .from('attendance')
      .select('student_id, date, status, pending')
      .order('date');

    const dateSet = new Set();
    const calcTotals = {};
    stus.forEach(s => { calcTotals[s.id] = { H: 0, S: 0, I: 0, A: 0 }; });

    if (attData) {
      attData.forEach(r => {
        dateSet.add(r.date);
        if (calcTotals[r.student_id] && r.status && !r.pending) {
          if (calcTotals[r.student_id].hasOwnProperty(r.status)) {
            calcTotals[r.student_id][r.status]++;
          }
        }
      });
    }

    setDates([...dateSet].sort());
    setTotals(calcTotals);
    setLoading(false);
  };



  const handleExportExcel = async () => {
    if (dates.length === 0 || students.length === 0) {
      showToast('Belum ada data untuk diunduh');
      return;
    }

    const { data: attData } = await supabase
      .from('attendance')
      .select('student_id, date, status, pending');

    // Map: { date: { student_id: record } }
    const attByDate = {};
    if (attData) {
      attData.forEach(r => {
        if (!attByDate[r.date]) attByDate[r.date] = {};
        attByDate[r.date][r.student_id] = r;
      });
    }

    const excelData = [];
    
    students.forEach(s => {
      const row = {
        'Nama Siswa': s.name,
        'NISN': s.nis || ''
      };
      
      dates.forEach(d => {
        const r = attByDate[d]?.[s.id];
        row[d] = r?.status ? r.status : (r?.pending ? 'Menunggu' : '');
      });
      
      excelData.push(row);
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Absensi");
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    XLSX.writeFile(workbook, `absenio_rekap_${todayStr}.xlsx`);
    
    showToast('File Excel diunduh');
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
            {dates.length > 0
              ? `${dates.length} hari tercatat · ${fmtDateLong(dates[0])} s.d. ${fmtDateLong(dates[dates.length - 1])}`
              : 'Belum ada data'}
          </div>
        </div>
        <Button variant="ghost" onClick={handleExportExcel}>Unduh Excel</Button>
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
