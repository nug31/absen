import React, { useState, useEffect } from 'react';
import SiswaMode from './components/SiswaMode/SiswaMode';
import GuruMode from './components/GuruMode/GuruMode';
import { ToastProvider } from './components/UI/Toast';

function App() {
  const [mode, setMode] = useState('siswa');
  const [clockDate, setClockDate] = useState('');

  useEffect(() => {
    const fmtDateLong = (dstr) => {
      try {
        return new Date(dstr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      } catch {
        return dstr;
      }
    };
    
    const todayStr = () => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    };

    setClockDate(fmtDateLong(todayStr()));
  }, []);

  return (
    <ToastProvider>
      <div className="plate">
        <div className="plate-left">
          <div className="plate-badge">TKR</div>
          <div>
            <div className="plate-title">X TKR 2</div>
            <div className="plate-sub">Absensi Siswa &middot; Bengkel Kelas</div>
          </div>
        </div>
        <div className="plate-date mono">{clockDate || '--'}</div>
      </div>

      <div className="switch-container">
        <button 
          className={`switch-btn ${mode === 'siswa' ? 'active' : ''}`}
          onClick={() => setMode('siswa')}
        >
          Mode Siswa
        </button>
        <button 
          className={`switch-btn ${mode === 'guru' ? 'active' : ''}`}
          onClick={() => setMode('guru')}
        >
          Mode Guru
        </button>
      </div>

      <main>
        {mode === 'siswa' ? <SiswaMode /> : <GuruMode />}
      </main>
    </ToastProvider>
  );
}

export default App;
