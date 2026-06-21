import { QURAN_DATA, getHizbAyahList, TOTAL_HIZB_COUNT } from '../constants/quranData';

/**
 * Calculates the Quran memorization progress given an array of memorization records.
 * @param {Array} studentMemos - Array of memorization records for a student
 * @returns {Object} Progress object containing surahs array, total percentage, total hizbs, etc.
 */
export const calculateProgress = (studentMemos) => {
  const progressBySurah = {};
  const uniqueAyahsMapped = new Set();

  studentMemos.forEach(memo => {
    // Only count records that are not in 'review' or 'bad' status... Wait, the original code in App.jsx didn't filter by status!
    // It filtered like this: const studentMemos = memorization.filter(m => m.studentId === studentId);
    // Which means all records counted. We will stick to the exact logic.
    
    if (memo.memoType === 'hizb' || memo.hizb) {
      const hizbNum = parseInt(memo.hizb);
      const hizbAyahs = getHizbAyahList(hizbNum);
      hizbAyahs.forEach(a => {
         uniqueAyahsMapped.add(`${a.surahId}-${a.ayah}`);
         if (!progressBySurah[a.surahId]) {
           const sData = QURAN_DATA[a.surahId - 1];
           progressBySurah[a.surahId] = { name: sData.name, total: sData.ayahs, memorized: new Set() };
         }
         progressBySurah[a.surahId].memorized.add(a.ayah);
      });
    } else {
      const surahData = QURAN_DATA.find(s => s.name === memo.surah);
      if (!surahData) return;

      if (!progressBySurah[surahData.id]) {
        progressBySurah[surahData.id] = { 
          name: surahData.name, 
          total: surahData.ayahs, 
          memorized: new Set() 
        };
      }

      const from = parseInt(memo.fromAyah);
      const to = parseInt(memo.toAyah);
      
      for (let i = from; i <= to; i++) {
        if (i <= surahData.ayahs) {
          progressBySurah[surahData.id].memorized.add(i);
          uniqueAyahsMapped.add(`${surahData.id}-${i}`);
        }
      }
    }
  });

  const surahs = Object.values(progressBySurah).map(s => ({
    name: s.name,
    percentage: Math.round((s.memorized.size / s.total) * 100),
    count: s.memorized.size,
    total: s.total
  })).sort((a, b) => b.percentage - a.percentage);

  // Count completed Hizbs: unique Hizb numbers from hizb-type records
  const completedHizbsSet = new Set();
  studentMemos.forEach(memo => {
    if (memo.memoType === 'hizb' || memo.hizb) {
      completedHizbsSet.add(parseInt(memo.hizb));
    }
  });
  
  // Also check if ayah coverage from surah records completes any Hizb
  for (let h = 1; h <= 60; h++) {
    if (completedHizbsSet.has(h)) continue; // already counted
    const hizbAyahs = getHizbAyahList(h);
    if (hizbAyahs.length === 0) continue;
    const covered = hizbAyahs.filter(a => uniqueAyahsMapped.has(`${a.surahId}-${a.ayah}`)).length;
    if (covered >= hizbAyahs.length) completedHizbsSet.add(h);
  }
  const totalPercentage = Math.round((completedHizbsSet.size / TOTAL_HIZB_COUNT) * 100);
  const totalHizbs = completedHizbsSet.size;

  return { 
    surahs, 
    totalPercentage, 
    totalHizbs, 
    totalAyahs: uniqueAyahsMapped.size,
    recordCount: studentMemos.length
  };
};
