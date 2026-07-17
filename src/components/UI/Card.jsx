import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`glass-panel ${className}`} {...props}>
      {children}
    </div>
  );
}
