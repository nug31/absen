import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import TopPelanggaran from '../UI/TopPelanggaran';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';
import defaultStudents from '../../data/defaultStudents';
import violationTypes from '../../data/violationTypes';

export default function GuruPanelPelanggaran() {
  const [dateStr, setDateStr] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  });
  const [students, setStudents] = useState([]);
  const [violations, setViolations] = useState({}); // { student_id: [type, ...] }
  const [loading, setLoading] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const showToast = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const { data: stuData } = await supabase.from('students').select('id, name, nis').order('name');
      setStudents((stuData && stuData.length > 0) ? stuData : defaultStudents);

      const { data, error } = await supabase
        .from('violations')
        .select('student_id, type')
        .eq('date', dateStr);

      setTableMissing(!!error);
      const map = {};
      if (data) data.forEach(r => { (map[r.student_id] = map[r.student_id] || []).push(r.type); });
      setViolations(map);
      setLoading(false);
    };
    loadData();
  }, [dateStr]);

  const handleToggle = async (stuId, type) => {
    const current = violations[stuId] || [];
    const isOn = current.includes(type);

    const { error } = isOn
      ? await supabase.from('violations').delete()
          .eq('student_id', stuId).eq('date', dateStr).eq('type', type)
      : await supabase.from('violations')
          .upsert({ student_id: stuId, date: dateStr, type }, { onConflict: 'student_id,date,type' });

    if (error) { showToast('Gagal: ' + error.message); return; }

    setViolations(prev => ({
      ...prev,
      [stuId]: isOn ? current.filter(t => t !== type) : [...current, type],
    }));
    setRefreshKey(k => k + 1);
  };

  const totalToday = Object.values(violations).reduce((acc, v) => acc + v.length, 0);

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span className="field-label">Tanggal</span>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
          </div>
          <div className="note" style={{ margin: 0, color: 'var(--text-primary)' }}>{totalToday} pelanggaran dicatat</div>
        </div>
        <div className="note">Ketuk atribut yang tidak dibawa siswa. Ketuk lagi untuk membatalkan.</div>
      </Card>

      {tableMissing && (
        <div className="status-box err">
          Tabel pelanggaran belum ada. Jalankan supabase_migration_pelanggaran.sql di Supabase SQL Editor, lalu muat ulang.
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        {loading ? (
          <div className="empty">Memuat data...</div>
        ) : students.length === 0 ? (
          <div className="empty"><b>Belum ada siswa</b>Tambahkan daftar siswa di tab "Kelola Siswa".</div>
        ) : (
          students.map(s => {
            const mine = violations[s.id] || [];
            return (
              <div key={s.id} className="roster-row">
                <div>
                  <span className="stu-name">{s.name}</span>
                  {mine.length > 0 && <span className="stu-nis" style={{ color: '#f87171' }}>{mine.length} pelanggaran</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {violationTypes.map(type => {
                    const on = mine.includes(type);
                    return (
                      <button
                        key={type}
                        onClick={() => handleToggle(s.id, type)}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 999,
                          cursor: 'pointer',
                          color: on ? '#fff' : 'var(--text-secondary)',
                          background: on ? 'var(--alpa)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${on ? 'var(--alpa)' : 'var(--surface-border)'}`,
                        }}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </Card>

      <TopPelanggaran refreshKey={refreshKey} />
    </div>
  );
}
