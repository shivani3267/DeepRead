import React from 'react';

const roleStyles = {
  admin: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
  faculty: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10',
  student: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
};

export const RoleBadge = ({ role, className = '' }) => {
  const safeRole = (role || 'student').toLowerCase();
  const style = roleStyles[safeRole] || roleStyles.student;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shadow-xs capitalize ${style} ${className}`}
    >
      {safeRole}
    </span>
  );
};
