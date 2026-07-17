import React from 'react';

export function Lightbox({ show, imgData, metaText, onClose }) {
  if (!show) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,17,19,0.9)', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        zIndex: 1000, padding: '24px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button 
        onClick={onClose}
        style={{
          position: 'absolute', top: '24px', right: '24px',
          background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none',
          width: '40px', height: '40px', borderRadius: '12px', fontSize: '20px', cursor: 'pointer',
          backdropFilter: 'blur(8px)'
        }}
      >
        &times;
      </button>
      <div style={{ textAlign: 'center' }}>
        <img 
          src={imgData} 
          alt="Lightbox" 
          style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }} 
        />
        <div style={{ color: '#E7E9EC', fontSize: '13px', marginTop: '16px', fontFamily: '"JetBrains Mono", monospace' }}>
          {metaText}
        </div>
      </div>
    </div>
  );
}
