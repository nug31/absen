import React from 'react';

export function Button({ variant = 'primary', size, className = '', children, ...props }) {
  let baseClass = 'btn';
  if (variant === 'primary') baseClass += ' btn-primary';
  else if (variant === 'ghost') baseClass += ' btn-ghost';
  else if (variant === 'danger') baseClass += ' btn-danger';
  
  if (size === 'sm') baseClass += ' btn-sm';
  if (props.block) baseClass += ' btn-block';
  
  return (
    <button className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
