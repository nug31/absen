export const storage = {
  get: async (key) => {
    try {
      if (window.storage && typeof window.storage.get === 'function') {
        const r = await window.storage.get(key, true);
        return r && r.value ? r.value : null;
      }
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Storage get error:', e);
      return localStorage.getItem(key);
    }
  },
  
  set: async (key, value) => {
    try {
      if (window.storage && typeof window.storage.set === 'function') {
        const r = await window.storage.set(key, value, true);
        if (!r) throw new Error('Window storage set failed');
        return true;
      }
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      localStorage.setItem(key, value);
      return true;
    }
  },

  list: async (prefix) => {
    try {
      if (window.storage && typeof window.storage.list === 'function') {
        const r = await window.storage.list(prefix, true);
        return r && r.keys ? r.keys : [];
      }
      return Object.keys(localStorage).filter(k => k.startsWith(prefix));
    } catch (e) {
      console.error('Storage list error:', e);
      return Object.keys(localStorage).filter(k => k.startsWith(prefix));
    }
  },
  
  remove: async (key) => {
    try {
      if (window.storage && typeof window.storage.remove === 'function') {
        await window.storage.remove(key, true);
        return true;
      }
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      localStorage.removeItem(key);
      return true;
    }
  }
};
