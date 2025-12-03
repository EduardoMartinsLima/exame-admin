import React from 'react';

interface Props {
  size?: number | string;
  className?: string;
}

export const KarateLogo: React.FC<Props> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      role="img"
      aria-label="Karate Logo"
    >
      {/* Circular border */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="6" />
      
      {/* Kanji: Empty (Kara) */}
      <text 
        x="50" 
        y="38" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fill="currentColor" 
        stroke="none"
        fontSize="36" 
        fontWeight="900" 
        fontFamily="'Noto Serif JP', 'Hiragino Mincho ProN', serif"
      >
        空
      </text>
      
      {/* Kanji: Hand (Te) */}
      <text 
        x="50" 
        y="76" 
        textAnchor="middle" 
        dominantBaseline="central" 
        fill="currentColor" 
        stroke="none"
        fontSize="36" 
        fontWeight="900" 
        fontFamily="'Noto Serif JP', 'Hiragino Mincho ProN', serif"
      >
        手
      </text>
    </svg>
  );
};