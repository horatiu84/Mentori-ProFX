import React from 'react';

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm ${className}`}
      {...props}
    />
  );
}
