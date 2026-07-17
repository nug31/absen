// storage.js — semua operasi sekarang pakai Supabase
// File ini dipertahankan sebagai compatibility layer untuk config saja.
// Data siswa & absensi langsung diakses via supabase client di masing-masing komponen.

import { supabase } from '../lib/supabase';

export const storage = {
  // Config: simpan di tabel config (key-value)
  get: async (key) => {
    try {
      if (key === 'config') {
        const { data, error } = await supabase.from('config').select('key, value');
        if (error) throw error;
        if (!data || data.length === 0) return null;
        const cfg = {};
        data.forEach(row => {
          try { cfg[row.key] = JSON.parse(row.value); }
          catch { cfg[row.key] = row.value; }
        });
        return JSON.stringify(cfg);
      }
      // Fallback localStorage untuk key lain
      return localStorage.getItem(key);
    } catch (e) {
      console.error('storage.get error:', e);
      return localStorage.getItem(key);
    }
  },

  set: async (key, value) => {
    try {
      if (key === 'config') {
        const cfg = JSON.parse(value);
        const upserts = Object.entries(cfg).map(([k, v]) => ({
          key: k,
          value: typeof v === 'object' ? JSON.stringify(v) : String(v),
        }));
        const { error } = await supabase.from('config').upsert(upserts, { onConflict: 'key' });
        if (error) throw error;
        return true;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('storage.set error:', e);
      localStorage.setItem(key, value);
      return true;
    }
  },
};
