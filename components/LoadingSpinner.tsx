import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <>
      <style>{`
        .pencil-loader {
          width: 150px;
          height: 20px;
          position: relative;
          background: #374151; /* Tailwind gray-700 */
          border-radius: 10px;
        }
        .pencil-loader::before {
          content: '';
          position: absolute;
          width: 0;
          height: 4px;
          background: #ea580c; /* Tailwind orange-600 */
          border-radius: 10px;
          top: 50%;
          left: 10px;
          transform: translateY(-50%);
          animation: writing 2s ease-in-out infinite;
        }
        .pencil-loader::after {
          content: '✎';
          font-size: 24px;
          color: #f9fafb; /* Tailwind gray-50 */
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 0;
          animation: moving-pencil 2s ease-in-out infinite;
        }
        @keyframes writing {
          0% { width: 0; }
          70% { width: calc(100% - 30px); }
          100% { width: calc(100% - 30px); }
        }
        @keyframes moving-pencil {
          0% { left: 0; }
          70% { left: calc(100% - 20px); }
          100% { left: calc(100% - 20px); }
        }
      `}</style>
      <div className="pencil-loader" role="status" aria-label="Loading content"></div>
    </>
  );
};

export default LoadingSpinner;
