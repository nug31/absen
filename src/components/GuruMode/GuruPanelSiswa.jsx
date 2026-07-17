import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';
import defaultStudents from '../../data/defaultStudents';

export default function GuruPanelSiswa() {
  const [students, setStudents] = useState([]);
  const [newNis, setNewNis] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const showToast = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) {
      showToast('Gagal memuat siswa');
      setStudents(defaultStudents);
    } else if (!data || data.length === 0) {
      // Seed data default ke Supabase jika masih kosong
      await seedDefaultStudents();
    } else {
      setStudents(data);
    }
    setLoading(false);
  };

  const seedDefaultStudents = async () => {
    const { error } = await supabase.from('students').insert(defaultStudents);
    if (error) {
      showToast('Gagal seed data: ' + error.message);
      setStudents(defaultStudents);
    } else {
      showToast('Data default 43 siswa dimuat');
      const { data } = await supabase.from('students').select('*').order('name');
      setStudents(data || defaultStudents);
    }
  };

  const handleAdd = async () => {
    const name = newName.trim();
    const nis = newNis.trim();
    if (!name) return showToast('Nama siswa wajib diisi');
    if (!nis) return showToast('NISN wajib diisi');

    if (students.some(s => s.nis && s.nis.toLowerCase() === nis.toLowerCase())) {
      return showToast('NISN sudah dipakai siswa lain');
    }

    const newStudent = {
      id: 'stu_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      name,
      nis,
    };

    const { error } = await supabase.from('students').insert(newStudent);
    if (error) return showToast('Gagal menambah: ' + error.message);

    setStudents(prev => [...prev, newStudent].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewNis('');
    showToast('Siswa ditambahkan');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus ${name} dari daftar?`)) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) return showToast('Gagal menghapus: ' + error.message);
    setStudents(prev => prev.filter(s => s.id !== id));
    showToast('Siswa dihapus');
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <span className="field-label">Tambah Siswa</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="NISN"
            value={newNis}
            onChange={e => setNewNis(e.target.value)}
            style={{ flex: 1, minWidth: 100 }}
          />
          <input
            type="text"
            placeholder="Nama lengkap siswa"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ flex: 2, minWidth: 180 }}
          />
          <Button onClick={handleAdd}>Tambah</Button>
        </div>
        <div className="note">NISN wajib diisi dan harus unik, karena dipakai siswa untuk check-in.</div>
      </Card>

      <Card>
        {loading ? (
          <div className="empty">Memuat daftar siswa...</div>
        ) : students.length === 0 ? (
          <div className="empty">
            <b>Daftar kosong</b>
            Tambahkan siswa menggunakan formulir di atas.
          </div>
        ) : (
          <div>
            {students.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--surface-border)' }}>
                <div>
                  <div className="stu-name">{s.name}</div>
                  {s.nis && <div className="stu-nis">NISN {s.nis}</div>}
                </div>
                <Button variant="danger" size="sm" onClick={() => handleDelete(s.id, s.name)}>Hapus</Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
