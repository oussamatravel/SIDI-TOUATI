import React from 'react';
import { QURAN_DATA } from '../constants/quranData';

const VisualQuran = ({ progressSurahs = [] }) => {
  return (
    <div className="card mt-6 border-t-4 border-t-green-500">
      <h4 className="font-bold border-b pb-4 mb-4 text-lg flex items-center gap-2 text-green-700">
        <span className="text-xl">📖</span>
        المصحف التفاعلي (تقدم الحفظ)
      </h4>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
        {QURAN_DATA.map(surah => {
          const stSurah = progressSurahs.find(s => s.name === surah.name);
          const percentage = stSurah ? stSurah.percentage : 0;
          
          let bgColor = 'bg-gray-50';
          let textColor = 'text-gray-400';
          let borderColor = 'border-transparent';
          
          if (percentage === 100) {
            bgColor = 'bg-green-500';
            textColor = 'text-white';
          } else if (percentage >= 50) {
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
            borderColor = 'border-green-300';
          } else if (percentage > 0) {
            bgColor = 'bg-green-50';
            textColor = 'text-green-700';
            borderColor = 'border-green-200';
          }

          return (
            <div 
              key={surah.id} 
              title={`سورة ${surah.name} - ${percentage}%`}
              className={`p-2 rounded-lg text-center flex flex-col items-center justify-center border ${bgColor} ${textColor} ${borderColor} hover:scale-105 transition-transform cursor-help relative overflow-hidden`}
            >
              <span className="text-[9px] opacity-60 mb-1 absolute top-1 right-1">{surah.id}</span>
              <span className="font-bold text-xs truncate w-full mt-2">{surah.name}</span>
              {percentage > 0 && percentage < 100 && (
                <div className="w-full bg-black/10 h-1.5 mt-2 rounded-full overflow-hidden">
                  <div className="bg-green-600 h-full" style={{ width: `${percentage}%` }}></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VisualQuran;
