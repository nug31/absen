import React, { useState, useEffect } from 'react';
import { Card } from '../UI/Card';
import { Button } from '../UI/Button';
import { useToast } from '../UI/Toast';
import { supabase } from '../../lib/supabase';

export default function GuruPanelSetting({ config, setConfig }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(200);
  const [newPin, setNewPin] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const showToast = useToast();

  // Load config dari Supabase saat mount
  useEffect(() => {
    const loadConfig = async () => {
      const { data } = await supabase.from('config').select('key, value');
      if (data) {
        const cfg = {};
        data.forEach(r => { cfg[r.key] = r.value; });
        if (cfg.schoolLat) setLat(cfg.schoolLat);
        if (cfg.schoolLng) setLng(cfg.schoolLng);
        if (cfg.radius) setRadius(cfg.radius);
        setConfig(cfg);
      }
    };
    loadConfig();
  }, []);

  const saveConfigKeys = async (pairs) => {
    const upserts = Object.entries(pairs).map(([k, v]) => ({ key: k, value: String(v) }));
    const { error } = await supabase.from('config').upsert(upserts, { onConflict: 'key' });
    if (error) throw error;
    setConfig(prev => ({ ...prev, ...pairs }));
  };

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
      () => {
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

    try {
      await saveConfigKeys({
        schoolLat: plat,
        schoolLng: plng,
        radius: isNaN(pradius) ? 200 : pradius,
      });
      showToast('Pengaturan lokasi tersimpan');
    } catch (e) {
      showToast('Gagal menyimpan: ' + e.message);
    }
  };

  const handleSavePin = async () => {
    const pin = newPin.trim();
    if (!/^\d{4}$/.test(pin)) {
      showToast('PIN harus 4 digit angka');
      return;
    }
    try {
      await saveConfigKeys({ pin });
      setNewPin('');
      showToast('PIN diperbarui');
    } catch (e) {
      showToast('Gagal menyimpan PIN: ' + e.message);
    }
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
        <div className="note" style={{ marginTop: 8 }}>PIN default: 3194. Konfigurasi tersimpan di database dan berlaku untuk semua device.</div>
      </Card>
    </div>
  );
}
