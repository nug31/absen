import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';

// Panels
import GuruPanelAbsen from './GuruPanelAbsen';
import GuruPanelSiswa from './GuruPanelSiswa';
import GuruPanelRekap from './GuruPanelRekap';
import GuruPanelSetting from './GuruPanelSetting';

export default function GuruMode() {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [config, setConfig] = useState(null);
  const [activeTab, setActiveTab] = useState('absen');
  const showToast = useToast();

  useEffect(() => {
    supabase.from('config').select('key, value').then(({ data }) => {
      const cfg = { pin: '1234' };
      if (data) data.forEach(r => { cfg[r.key] = r.value; });
      setConfig(cfg);
    });
  }, []);

  const handlePinChange = (idx, val) => {
    const newPin = [...pin];
    newPin[idx] = val;
    setPin(newPin);
    if (val && idx < 3) {
      document.getElementById(`pin-${idx+1}`).focus();
    }
  };

  const handlePinKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      document.getElementById(`pin-${idx-1}`).focus();
    }
    if (e.key === 'Enter') {
      submitPin();
    }
  };

  const submitPin = () => {
    const entered = pin.join('');
    if (entered.length < 4) {
      showToast('Masukkan 4 digit PIN');
      return;
    }
    if (entered === (config?.pin || '1234')) {
      setAuthed(true);
      setPin(['', '', '', '']);
    } else {
      showToast('PIN salah');
      setPin(['', '', '', '']);
      document.getElementById('pin-0').focus();
    }
  };

  if (!authed) {
    return (
      <div style={{ maxWidth: 380, margin: '0 auto' }}>
        <Card style={{ textAlign: 'center' }}>
          <span className="field-label">PIN Guru</span>
          <div className="pin-boxes">
            {[0, 1, 2, 3].map(idx => (
              <input
                key={idx}
                id={`pin-${idx}`}
                type="password"
                maxLength={1}
                inputMode="numeric"
                value={pin[idx]}
                onChange={e => handlePinChange(idx, e.target.value)}
                onKeyDown={e => handlePinKeyDown(e, idx)}
              />
            ))}
          </div>
          <Button block onClick={submitPin}>Masuk</Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="note" style={{ margin: 0, color: 'var(--text-primary)' }}>Masuk sebagai guru/wali kelas</div>
        <Button variant="ghost" size="sm" onClick={() => setAuthed(false)}>Keluar</Button>
      </div>

      <div className="switch-container" style={{ marginBottom: 16 }}>
        <button className={`switch-btn ${activeTab === 'absen' ? 'active' : ''}`} onClick={() => setActiveTab('absen')}>Absensi</button>
        <button className={`switch-btn ${activeTab === 'siswa' ? 'active' : ''}`} onClick={() => setActiveTab('siswa')}>Kelola Siswa</button>
        <button className={`switch-btn ${activeTab === 'rekap' ? 'active' : ''}`} onClick={() => setActiveTab('rekap')}>Rekap</button>
        <button className={`switch-btn ${activeTab === 'setting' ? 'active' : ''}`} onClick={() => setActiveTab('setting')}>Pengaturan</button>
      </div>

      <div>
        {activeTab === 'absen' && <GuruPanelAbsen />}
        {activeTab === 'siswa' && <GuruPanelSiswa />}
        {activeTab === 'rekap' && <GuruPanelRekap />}
        {activeTab === 'setting' && <GuruPanelSetting config={config} setConfig={setConfig} />}
      </div>
    </div>
  );
}
