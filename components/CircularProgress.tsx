
import React from 'react';
import { Check } from 'lucide-react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ 
  percentage, 
  size = 40, 
  strokeWidth = 4, 
  color = "#ea580c" // orange-600
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const isComplete = percentage >= 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Circle */}
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#374151" // gray-700
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        {!isComplete && (
             <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
            />
        )}
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {isComplete ? (
          <div className="bg-green-500 rounded-full p-1">
            <Check size={size * 0.5} className="text-white" strokeWidth={4} />
          </div>
        ) : (
          <span>{Math.round(percentage)}%</span>
        )}
      </div>
    </div>
  );
};

export default CircularProgress;
