'use client';

import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
};

export default function Button({ variant = 'primary', loading, className = '', children, ...rest }: Props) {
  const base = 'px-4 py-2 rounded text-sm font-medium disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : variant === 'secondary'
      ? 'bg-gray-600 text-white hover:bg-gray-700'
      : 'bg-transparent hover:bg-gray-100';

  return (
    <button className={`${base} ${styles} ${className}`} {...rest}>
      {loading ? 'Đang xử lý…' : children}
    </button>
  );
}


