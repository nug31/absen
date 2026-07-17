import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { storage } from '../../utils/storage';
import defaultStudents from '../../data/defaultStudents';

export default function GuruPanelSiswa() {
  const [students, setStudents] = useState([]);
  const [newNis, setNewNis] = useState('');
  const [newName, setNewName] = useState('');
  const showToast = useToast();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    const r = await storage.get('students');
    if (r) {
      setStudents(JSON.parse(r));
    } else {
      // Auto-load default students on first launch
      await storage.set('students', JSON.stringify(defaultStudents));
      setStudents(defaultStudents);
    }
  };

  const saveStudents = async (data) => {
    await storage.set('students', JSON.stringify(data));
    setStudents(data);
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
      nis
    };

    const updated = [...students, newStudent];
    await saveStudents(updated);
    setNewName('');
    setNewNis('');
    showToast('Siswa ditambahkan');
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Hapus ${name} dari daftar? Riwayat absensinya tetap tersimpan.`)) return;
    const updated = students.filter(s => s.id !== id);
    await saveStudents(updated);
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
        {students.length === 0 ? (
          <div className="empty">
            <b>Daftar kosong</b>
            Tambahkan siswa pertama menggunakan formulir di atas.
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
