import React, { useState } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { storage } from '../../utils/storage';

export default function GuruPanelSetting({ config, setConfig }) {
  const [lat, setLat] = useState(config?.schoolLat ?? '');
  const [lng, setLng] = useState(config?.schoolLng ?? '');
  const [radius, setRadius] = useState(config?.radius ?? 200);
  const [newPin, setNewPin] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const showToast = useToast();

  const handleUseCurrentLoc = () => {
    if (!navigator.geolocation) {
      showToast('Geolokasi tidak didukung browser ini');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setIsLocating(false);
        showToast('Lokasi saat ini diambil, jangan lupa Simpan');
      },
      err => {
        setIsLocating(false);
        showToast('Gagal mengambil lokasi');
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const handleSaveLoc = async () => {
    const plat = parseFloat(lat);
    const plng = parseFloat(lng);
    const pradius = parseInt(radius, 10);
    
    if (isNaN(plat) || isNaN(plng)) {
      showToast('Lat/Lng belum valid');
      return;
    }
    
    const newConfig = { ...config, schoolLat: plat, schoolLng: plng, radius: isNaN(pradius) ? 200 : pradius };
    await storage.set('config', JSON.stringify(newConfig));
    setConfig(newConfig);
    showToast('Pengaturan lokasi tersimpan');
  };

  const handleSavePin = async () => {
    const pin = newPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      showToast('PIN harus 4 digit angka');
      return;
    }
    const newConfig = { ...config, pin };
    await storage.set('config', JSON.stringify(newConfig));
    setConfig(newConfig);
    setNewPin('');
    showToast('PIN diperbarui');
  };

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <span className="field-label">Titik Lokasi Sekolah</span>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="note" style={{ margin: '0 0 4px' }}>Lintang (lat)</div>
            <input type="text" placeholder="-6.200000" value={lat} onChange={e => setLat(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <div className="note" style={{ margin: '0 0 4px' }}>Bujur (lng)</div>
            <input type="text" placeholder="106.816666" value={lng} onChange={e => setLng(e.target.value)} />
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={handleUseCurrentLoc} disabled={isLocating}>
          {isLocating ? 'Mengambil lokasi...' : 'Gunakan Lokasi Saya Sekarang'}
        </Button>
        
        <div style={{ marginTop: 16 }}>
          <div className="note" style={{ margin: '0 0 4px' }}>Radius toleransi (meter)</div>
          <input type="number" min="10" step="10" value={radius} onChange={e => setRadius(e.target.value)} />
        </div>
        
        <Button onClick={handleSaveLoc} style={{ marginTop: 16 }}>Simpan Pengaturan Lokasi</Button>
      </Card>

      <Card>
        <span className="field-label">Ubah PIN Guru</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="PIN baru (4 digit)" 
            maxLength="4" 
            style={{ maxWidth: 160 }}
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
          />
          <Button variant="ghost" onClick={handleSavePin}>Simpan PIN</Button>
        </div>
      </Card>
    </div>
  );
}
