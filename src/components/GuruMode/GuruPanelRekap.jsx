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
    stus.forEach(s => { calcTotals[s.id] = { H: 0, S: 0, I: 0, A: 0, E: 0 }; });

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

    // Fetch attendance data
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

    // Helper: get status label for cell
    const getCell = (rec) => {
      if (!rec) return '';
      if (rec.pending) return 'Menunggu';
      if (rec.status === 'H') return '✓';
      if (rec.status === 'S') return 'S';
      if (rec.status === 'I') return 'I';
      if (rec.status === 'A') return 'A';
      if (rec.status === 'E') return 'E';
      return rec.status || '';
    };

    // Group dates by "Bulan Tahun"
    const monthGroups = [];
    let curGroup = null;
    dates.forEach(d => {
      const dt = new Date(d + 'T00:00:00');
      const label = dt.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }).toUpperCase();
      if (!curGroup || curGroup.label !== label) {
        curGroup = { label, dates: [] };
        monthGroups.push(curGroup);
      }
      curGroup.dates.push(d);
    });

    // ── Build AOA (Array of Arrays) ──────────────────────────────────────

    // Fixed columns: No | Nama | NISN  → count = 3
    const fixedCount = 3;
    // Date columns = dates.length
    // Rekap columns: S | I | A  → count = 3
    const rekapCount = 3;
    const totalCols = fixedCount + dates.length + rekapCount;

    // Row 0: title header (merged per month)
    const row0 = Array(totalCols).fill('');
    row0[0] = 'No';
    row0[1] = 'Nama';
    row0[2] = 'NISN';
    let colOffset = fixedCount;
    monthGroups.forEach(g => {
      row0[colOffset] = g.label;
      colOffset += g.dates.length;
    });
    row0[fixedCount + dates.length] = 'REKAP';

    // Row 1: date numbers header
    const row1 = Array(totalCols).fill('');
    row1[0] = '';
    row1[1] = '';
    row1[2] = '';
    dates.forEach((d, i) => {
      row1[fixedCount + i] = new Date(d + 'T00:00:00').getDate();
    });
    row1[fixedCount + dates.length]     = 'S';
    row1[fixedCount + dates.length + 1] = 'I';
    row1[fixedCount + dates.length + 2] = 'A';

    const aoa = [row0, row1];

    // Data rows
    students.forEach((s, idx) => {
      const row = Array(totalCols).fill('');
      row[0] = idx + 1;
      row[1] = s.name;
      row[2] = s.nis || '';

      const t = totals[s.id] || { H: 0, S: 0, I: 0, A: 0, E: 0 };
      dates.forEach((d, i) => {
        row[fixedCount + i] = getCell(attByDate[d]?.[s.id]);
      });

      row[fixedCount + dates.length]     = t.S;
      row[fixedCount + dates.length + 1] = t.I;
      row[fixedCount + dates.length + 2] = t.A;
      aoa.push(row);
    });

    // Grand total row
    const totalRow = Array(totalCols).fill('');
    totalRow[1] = 'TOTAL';
    const grandS = students.reduce((acc, s) => acc + (totals[s.id]?.S || 0), 0);
    const grandI = students.reduce((acc, s) => acc + (totals[s.id]?.I || 0), 0);
    const grandA = students.reduce((acc, s) => acc + (totals[s.id]?.A || 0), 0);
    totalRow[fixedCount + dates.length]     = grandS;
    totalRow[fixedCount + dates.length + 1] = grandI;
    totalRow[fixedCount + dates.length + 2] = grandA;
    aoa.push(totalRow);

    // ── Build worksheet ──────────────────────────────────────────────────
    const worksheet = XLSX.utils.aoa_to_sheet(aoa);

    // Merge cells: month labels & REKAP header
    const merges = [];
    // Merge "No", "Nama", "NISN" vertically (row 0 & 1)
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }); // No
    merges.push({ s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }); // Nama
    merges.push({ s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }); // NISN
    // Merge month headers horizontally
    let mCol = fixedCount;
    monthGroups.forEach(g => {
      if (g.dates.length > 1) {
        merges.push({ s: { r: 0, c: mCol }, e: { r: 0, c: mCol + g.dates.length - 1 } });
      }
      mCol += g.dates.length;
    });
    // Merge REKAP header horizontally
    merges.push({ s: { r: 0, c: fixedCount + dates.length }, e: { r: 0, c: fixedCount + dates.length + 2 } });
    worksheet['!merges'] = merges;

    // Column widths
    const cols = [
      { wch: 4 },   // No
      { wch: 28 },  // Nama
      { wch: 14 },  // NISN
      ...dates.map(() => ({ wch: 4 })),  // date cols (narrow)
      { wch: 6 },   // S
      { wch: 6 },   // I
      { wch: 6 },   // A
    ];
    worksheet['!cols'] = cols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');

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
                <th className="num">E</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const t = totals[s.id] || { H: 0, S: 0, I: 0, A: 0, E: 0 };
                return (
                  <tr key={s.id}>
                    <td style={{ paddingLeft: 20, fontWeight: 500 }}>{s.name}</td>
                    <td className="num" style={{ color: 'var(--present)' }}>{t.H}</td>
                    <td className="num" style={{ color: 'var(--sick)' }}>{t.S}</td>
                    <td className="num" style={{ color: 'var(--izin)' }}>{t.I}</td>
                    <td className="num" style={{ color: 'var(--alpa)' }}>{t.A}</td>
                    <td className="num" style={{ color: 'var(--eskul, #8b5cf6)' }}>{t.E}</td>
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
