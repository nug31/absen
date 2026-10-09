import React, { useState, useEffect } from 'react';
import { Card } from './Card';
import { supabase } from '../../lib/supabase';

const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const fetchViolations = async (fromDate) => {
  let all = [];
  let from = 0;
  const limit = 1000;
  for (;;) {
    let q = supabase
      .from('violations')
      .select('type, students(id, name)')
      .order('date')
      .range(from, from + limit - 1);
    if (fromDate) q = q.gte('date', fromDate);
    const { data, error } = await q;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < limit) break;
    from += limit;
  }
  return all;
};

const rankViolations = (rows) => {
  const map = {};
  rows.forEach(r => {
    const stu = r.students;
    if (!stu) return;
    if (!map[stu.id]) map[stu.id] = { id: stu.id, name: stu.name, total: 0, types: {} };
    map[stu.id].total++;
    map[stu.id].types[r.type] = (map[stu.id].types[r.type] || 0) + 1;
  });
  return Object.values(map).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
};

// limit: tampilkan N teratas saja. refreshKey: ubah untuk memuat ulang.
export default function TopPelanggaran({ limit, refreshKey }) {
  const [period, setPeriod] = useState('month'); // month, all
  const [ranking, setRanking] = useState([]);
  const [state, setState] = useState('loading'); // loading, ready, error

  useEffect(() => {
    let cancelled = false;
    fetchViolations(period === 'month' ? monthStart() : null)
      .then(rows => {
        if (cancelled) return;
        setRanking(rankViolations(rows));
        setState('ready');
      })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [period, refreshKey]);

  // Di halaman siswa, sembunyikan saja kalau datanya tidak bisa dimuat
  if (state === 'error' && limit) return null;

  const shown = limit ? ranking.slice(0, limit) : ranking;

  return (
    <Card style={{ marginBottom: 24, textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ fontFamily: '"Outfit", sans-serif', fontWeight: 600, fontSize: 16, color: '#f87171' }}>
          Top Pelanggaran Atribut
        </div>
        <div className="rocker">
          <button className={period === 'month' ? 'on a' : ''} onClick={() => setPeriod('month')}>Bulan Ini</button>
          <button className={period === 'all' ? 'on a' : ''} onClick={() => setPeriod('all')}>Semua</button>
        </div>
      </div>
      <div className="note" style={{ marginTop: 0, marginBottom: 12 }}>
        Tidak membawa topi, ID card, nametag, dan atribut lain. Jangan sampai namamu ada di sini.
      </div>

      {state === 'loading' ? (
        <div className="empty" style={{ padding: 16 }}>Memuat...</div>
      ) : state === 'error' ? (
        <div className="status-box err" style={{ marginBottom: 0 }}>Gagal memuat data pelanggaran.</div>
      ) : shown.length === 0 ? (
        <div className="status-box ok" style={{ marginBottom: 0 }}>Belum ada pelanggaran. Pertahankan!</div>
      ) : (
        shown.map((s, idx) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: idx < shown.length - 1 ? '1px solid var(--surface-border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: '"JetBrains Mono", monospace', fontSize: 13, fontWeight: 700,
              background: idx < 3 ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)',
              color: idx < 3 ? '#f87171' : 'var(--text-secondary)',
            }}>
              {idx + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                {Object.entries(s.types).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${n}× ${t}`).join(' · ')}
              </div>
            </div>
            <div style={{ fontFamily: '"Outfit", sans-serif', fontSize: 20, fontWeight: 700, color: '#f87171', flexShrink: 0 }}>
              {s.total}
            </div>
          </div>
        ))
      )}
    </Card>
  );
}
