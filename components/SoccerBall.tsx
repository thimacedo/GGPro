
import React from 'react';

export const SoccerBall = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    stroke="currentColor"
    strokeWidth="0"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <circle cx="12" cy="12" r="10" fill="#fff" />
    <path
      fill="#000"
      d="M12 2.1a9.9 9.9 0 018.6 5l-4.9 2.8-4.9-8.6A9.9 9.9 0 0112 2.1zM3.4 7.1a9.9 9.9 0 014.9-2.8L12 12.9 7.1 15.7a9.9 9.9 0 01-3.7-8.6zM15.7 16.9a9.9 9.9 0 01-7.4 0L12 12.9l3.7 4zM20.6 16.9a9.9 9.9 0 01-4.9 2.8L12 11.1l4.9 8.6a9.9 9.9 0 013.7-2.8zM8.3 7.1L12 11.1l3.7-6.8a9.9 9.9 0 00-7.4 0z"
    />
  </svg>
);
