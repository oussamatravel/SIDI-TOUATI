import React, { useState, useRef } from 'react';
import { X, Printer, RefreshCw, Star } from 'lucide-react';

// ===== Phrases organized by level =====
const PHRASES = {
  'ما قبل التمدرس': [
    { text: 'أحسنتَ يا بطل! أنت فخر مدرستنا ⭐', sub: 'استمر في التعلم والحفظ' },
    { text: 'ما شاء الله! حرف القرآن في قلبك نور 🌟', sub: 'بارك الله فيك وفي جهودك' },
    { text: 'يا نجمنا الصغير! كل يوم تزداد تألقاً ✨', sub: 'أهلاً بك في عائلة القرآن الكريم' },
    { text: 'رائع جداً! أنت طالب مجتهد ومتميز 🏆', sub: 'الله يحفظك ويرعاك دائماً' },
    { text: 'عافاك الله! قلبك مليء بحب القرآن 💚', sub: 'استمر، فالطريق الجميل بدأ لتوّه' },
    { text: 'أنت فرحة أستاذك ومدرستك 🌙', sub: 'بارك الله في خطواتك الأولى' },
    { text: 'تبارك الله! أنت من أحب الله قرآنه 📖', sub: 'القرآن رفيق العمر الطيب' },
    { text: 'يا حافظ القرآن الصغير! المستقبل لك 🌈', sub: 'نحن فخورون بك كل يوم' },
    { text: 'ما أروعك! تلاوتك كزقزقة العصافير 🕊️', sub: 'حفظك يسعد قلوبنا' },
    { text: 'بسم الله ما شاء الله! كوكبنا المتلألئ 🌟', sub: 'القرآن يزين حياتك' },
    { text: 'بطل القراءة والحفظ! أحسنت صنعاً 👑', sub: 'إلى الأمام دائماً يا صغيري' },
    { text: 'فرحة والديْك بك اليوم كبيرة 💖', sub: 'جعل الله القرآن ربيع قلبك' },
    { text: 'أنت زهرة يفوح منها شذى القرآن 🌸', sub: 'حفظك كعطر المسك والريحان' },
    { text: 'ممتاز! خطوة بخطوة نحو ختم القرآن 👣', sub: 'رحلة الألف ميل تبدأ بخطوة' },
    { text: 'شبل القرآن الصغير.. بوركت جهودك 🦁', sub: 'أنت تصنع مجدك بحفظ كلام الله' },
  ],
  'ابتدائي': [
    { text: 'أحسنت! حفظك لسورة جديدة عمل عظيم 🌟', sub: 'بارك الله في همتك وصبرك' },
    { text: 'ما شاء الله! أنت في طريق أهل القرآن 📖', sub: 'كل سورة تحفظها نور يُضاء في قلبك' },
    { text: 'عبرت بتفوق! جهدك يحمل ثمرة طيبة 🏆', sub: 'الملائكة تشهد لك بالاجتهاد' },
    { text: 'تبارك الله! سترى ثمار جهدك قريباً ✨', sub: 'من حفظ القرآن كان من أهل الله وخاصته' },
    { text: 'رائع! هكذا يكون الطالب المثالي ⭐', sub: 'استمر في المراجعة لتثبيت ما حفظت' },
    { text: 'أحسنت يا حافظ القرآن! 🌙', sub: 'القرآن يرفع أهله في الدنيا والآخرة' },
    { text: 'نعم الطالب أنت! ثمرة جهدك تنتظرك 💚', sub: 'واصل مسيرتك مع كلام الله' },
    { text: 'بارك الله فيك! أنت تُسعد من حولك 🌈', sub: 'حفظ القرآن هبة لا تُقدّر بثمن' },
    { text: 'إنجاز رائع! لقد رفعت رأس والديك عالياً 👑', sub: 'تاج الوقار ينتظرهما بفضلك' },
    { text: 'ما شاء الله! ذاكرتك كنز ثمين فاحفظه بالقرآن 💎', sub: 'القرآن حصن حصين لك' },
    { text: 'أنت مثال للإرادة والتصميم القوي 💪', sub: 'لا مستحيل مع التوكل على الله' },
    { text: 'همتك تناطح السحاب يا بطل ☁️', sub: 'القرآن يصنع العظماء' },
    { text: 'أثبتّ اليوم أنك قادر على التميز 🎯', sub: 'اجعل القرآن هدفك الأسمى' },
    { text: 'كل آية تحفظها ترقى بها درجة في الجنة 🪜', sub: 'اقرأ وارتقِ ورتل' },
    { text: 'أبدعت! قراءتك تسر السامعين 🎧', sub: 'صوتك بالقرآن يبهج الأرواح' },
  ],
  'متوسط': [
    { text: 'ما شاء الله! همتك تُلهم من حولك ⭐', sub: 'الثبات على الحفظ والمراجعة طريق النجاح' },
    { text: 'أحسنت! أنت تُثبت كل يوم قدرتك 🏆', sub: 'بارك الله في جهدك المتواصل' },
    { text: 'عبرت بامتياز! القرآن يشهد لك 📖', sub: 'من أهل القرآن أنت' },
    { text: 'تبارك الله! مستواك يتحسن باستمرار ✨', sub: 'واصل، فالهدف قريب' },
    { text: 'رائع! ثقتنا بك تزداد يوماً بعد يوم 🌟', sub: 'مراجعة اليوم تثبّت حفظ الأمس' },
    { text: 'إصرارك على الحفظ مفتاح نجاحك 🗝️', sub: 'القرآن يبني شخصيتك القيادية' },
    { text: 'أنت شاب قرآني يُعتمد عليه 🤝', sub: 'أخلاق القرآن تظهر في أفعالك' },
  ],
  'ثانوي': [
    { text: 'ما شاء الله! أنت نموذج يُحتذى به 🌟', sub: 'جهدك المبكر سيُقطف يوم القيامة' },
    { text: 'أحسنت! هذا المستوى يستحق كل إشادة 🏆', sub: 'من القرآن ابتدأت، وإلى الإجازة تتقدم' },
    { text: 'تبارك الله! حفظك يسعد الأسرة والمدرسة 💚', sub: 'واصل مسيرة العلم والحفظ' },
    { text: 'رائع! حفظك يُضيء دربك في الدنيا والآخرة ✨', sub: 'القرآن ذخر لصاحبه' },
    { text: 'شبابك في طاعة الله مكسب عظيم 🌅', sub: 'سبعة يظلهم الله في ظله...' },
    { text: 'أنت تبني مستقبلك بأساس متين 🏗️', sub: 'القرآن هو البوصلة الحقيقية' },
  ],
  'كبار': [
    { text: 'بارك الله فيك! مثابرتك مضرب مثل 🌟', sub: 'لا يأس مع القرآن، وأنت خير دليل' },
    { text: 'ما شاء الله! لم يفت أوان الخير أبداً 💚', sub: 'القرآن يُنوّر القلب في كل سن' },
    { text: 'أحسنت! شجاعتك على التعلم تُلهمنا 🏆', sub: 'جعل الله قرآنك نوراً يوم القيامة' },
    { text: 'عزيمتك تقهر المستحيل ✨', sub: 'القرآن لا يعرف عمراً محدداً' },
    { text: 'أنت بركة هذا المركز ونوره 🕯️', sub: 'وقار السن يزدان بوقار القرآن' },
  ],
  'محو الأمية': [
    { text: 'ما شاء الله! فتحت أبواب النور على نفسك 📖', sub: 'القراءة مفتاح العلم والمعرفة' },
    { text: 'أحسنت! لا حدود للتعلم مهما تقدم العمر 🌟', sub: 'اقرأ باسم ربك الذي خلق' },
    { text: 'بارك الله فيك! إقبالك على العلم تكريم لنفسك 💚', sub: 'العلم نور والجهل ظلام' },
    { text: 'رائع! كل حرف تتعلمه صدقة جارية ✨', sub: 'واصل مسيرة العلم المباركة' },
    { text: 'خطواتك الأولى في القراءة إنجاز كبير 👣', sub: 'الله يسهل طريقك للعلم' },
  ],
  'العلوم الشرعية': [
    { text: 'ما شاء الله! علمك الشرعي نور يهدي 🌙', sub: 'العلماء ورثة الأنبياء' },
    { text: 'أحسنت! فقهك في الدين أمانة عظيمة 📖', sub: 'طالب العلم في سبيل الله' },
    { text: 'بارك الله فيك! فهمك المتميز يُسعدنا 🌟', sub: 'من يرد الله به خيراً يفقهه في الدين' },
    { text: 'تبارك الله! العلم الشرعي زاد لا ينضب ✨', sub: 'واصل تعلمك وادعُ إلى الله بعلمك' },
  ],
  'الإجازة': [
    { text: 'ما شاء الله! وصلت إلى مرحلة الإجازة 🏆', sub: 'إجازتك في القرآن شرف عظيم' },
    { text: 'بارك الله فيك! أنت من أهل الله وخاصته 🌙', sub: 'القرآن ترفعه وتحمل راية الحفظ' },
    { text: 'تبارك الله! ما أجمل أن تنضم لسلسلة الإسناد ✨', sub: 'بالقرآن رُفعت أقوام وبه وُضع آخرون' },
    { text: 'أحسنت! الإجازة وسام شرف ومسؤولية عظيمة 📖', sub: 'حمل القرآن مسؤولية تليق بك' },
  ],
  'default': [
    { text: 'أحسنت! جهدك واضح ومثمر 🌟', sub: 'بارك الله في مسيرتك' },
    { text: 'رائع! استمر في التقدم والعطاء 🏆', sub: 'نحن فخورون بك' },
    { text: 'ما شاء الله! نجمنا المتألق ✨', sub: 'الله يحفظك ويسددك' },
  ]
};

const CARD_THEMES = [
  {
    id: 'gold',
    name: 'الذهبي',
    bg: 'from-yellow-50 to-amber-50',
    border: 'border-yellow-400',
    header: 'from-yellow-600 to-amber-500',
    accent: 'text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
    star: 'text-yellow-500',
    pattern: '✦',
  },
  {
    id: 'green',
    name: 'الأخضر',
    bg: 'from-green-50 to-emerald-50',
    border: 'border-emerald-400',
    header: 'from-emerald-700 to-green-600',
    accent: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-800',
    star: 'text-emerald-500',
    pattern: '❋',
  },
  {
    id: 'blue',
    name: 'الأزرق',
    bg: 'from-blue-50 to-sky-50',
    border: 'border-blue-400',
    header: 'from-blue-700 to-sky-600',
    accent: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-800',
    star: 'text-blue-500',
    pattern: '✿',
  },
  {
    id: 'purple',
    name: 'البنفسجي',
    bg: 'from-purple-50 to-violet-50',
    border: 'border-purple-400',
    header: 'from-purple-700 to-violet-600',
    accent: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-800',
    star: 'text-purple-500',
    pattern: '✵',
  },
];

export default function PraiseCard({ student, onClose, schoolName }) {
  const level = student?.level || 'default';
  const phrases = PHRASES[level] || PHRASES['default'];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [themeIndex, setThemeIndex] = useState(level === 'ما قبل التمدرس' || level === 'ابتدائي' ? 0 : 1);
  const cardRef = useRef(null);

  const theme = CARD_THEMES[themeIndex];
  const phrase = phrases[phraseIndex];
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const nextPhrase = () => setPhraseIndex((phraseIndex + 1) % phrases.length);

  const handlePrint = () => {
    const printContent = cardRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>بطاقة استحسان - ${student.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A5 landscape; margin: 0; }
          body { 
            font-family: 'Cairo', 'Amiri', serif; 
            background: white; 
            margin: 0; 
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-container { 
            width: 19cm; 
            height: 13cm; 
            margin: auto; 
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .print-card {
             width: 100%;
             height: 100%;
          }
          /* Fixes for Tailwind Gradients in print */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        </style>
      </head>
      <body>
        <div class="print-container">
           ${printContent.replace(/className="/g, 'class="')}
        </div>
        <script>
          // Give Tailwind a second to render styles before opening print dialog
          setTimeout(() => {
            window.print();
            window.close();
          }, 800);
        </script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Controls Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Star className="text-yellow-500" size={20} fill="currentColor" />
            <h3 className="font-bold text-gray-800">بطاقة الاستحسان</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme selector */}
            <div className="flex gap-1">
              {CARD_THEMES.map((t, i) => (
                <button
                  key={t.id}
                  onClick={() => setThemeIndex(i)}
                  title={t.name}
                  className={`w-6 h-6 rounded-full bg-gradient-to-br ${t.header} border-2 transition-all ${themeIndex === i ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                />
              ))}
            </div>
            <button
              onClick={nextPhrase}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-bold"
              title="عبارة أخرى"
            >
              <RefreshCw size={13} />
              عبارة أخرى
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-green-700 transition-colors font-bold"
            >
              <Printer size={13} />
              طباعة
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Card Preview */}
        <div className="p-6 bg-gray-100">
          <div
            ref={cardRef}
            dir="rtl"
            className={`relative bg-gradient-to-br ${theme.bg} border-4 ${theme.border} rounded-2xl overflow-hidden shadow-xl`}
            style={{ fontFamily: "'Cairo', 'Amiri', serif" }}
          >
            {/* Decorative corner patterns */}
            <div className="absolute top-2 right-3 text-4xl opacity-10 select-none" style={{ color: '#000' }}>
              {theme.pattern}{theme.pattern}
            </div>
            <div className="absolute top-2 left-3 text-4xl opacity-10 select-none" style={{ color: '#000' }}>
              {theme.pattern}{theme.pattern}
            </div>
            <div className="absolute bottom-2 right-3 text-4xl opacity-10 select-none" style={{ color: '#000' }}>
              {theme.pattern}{theme.pattern}
            </div>
            <div className="absolute bottom-2 left-3 text-4xl opacity-10 select-none" style={{ color: '#000' }}>
              {theme.pattern}{theme.pattern}
            </div>

            {/* Header */}
            <div className={`bg-gradient-to-r ${theme.header} text-white text-center py-4 px-6`}>
              <p className="text-xs opacity-80 tracking-widest mb-1">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
              <h2 className="text-2xl font-bold tracking-wide">بطاقة استحسان وتشجيع</h2>
              <p className="text-xs opacity-70 mt-1">{schoolName || 'مدرسة تحفيظ القرآن الكريم'}</p>
            </div>

            {/* Body */}
            <div className="px-8 py-6 text-center space-y-5">
              {/* Stars row */}
              <div className={`flex justify-center gap-2 ${theme.star}`}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-xl">★</span>
                ))}
              </div>

              {/* Presented to */}
              <div>
                <p className="text-sm text-gray-500 mb-1">تُقدَّم لـ</p>
                <p className={`text-3xl font-bold ${theme.accent}`}>
                  {student.name}
                </p>
                <span className={`inline-block mt-2 px-4 py-1 rounded-full text-xs font-bold ${theme.badge}`}>
                  {level}
                </span>
              </div>

              {/* Decorative divider */}
              <div className={`flex items-center gap-3 ${theme.accent}`}>
                <div className="flex-1 h-px bg-current opacity-20" />
                <span className="text-lg">{theme.pattern}</span>
                <div className="flex-1 h-px bg-current opacity-20" />
              </div>

              {/* Main phrase */}
              <div className="space-y-2">
                <p className={`text-xl font-bold leading-relaxed ${theme.accent}`}>
                  {phrase.text}
                </p>
                <p className="text-sm text-gray-500 italic">{phrase.sub}</p>
              </div>

              {/* Quranic ayah */}
              <div className={`bg-white/60 rounded-xl px-4 py-3 border border-current border-opacity-10`}>
                <p className={`text-base font-bold ${theme.accent}`} style={{ fontFamily: 'Amiri, serif', fontSize: '1.1rem' }}>
                  ﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾
                </p>
                <p className="text-xs text-gray-400 mt-1">سورة الطلاق - آية 2</p>
              </div>

              {/* Stars row bottom */}
              <div className={`flex justify-center gap-2 ${theme.star}`}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-xl">★</span>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={`bg-gradient-to-r ${theme.header} text-white text-center py-3 px-6 flex justify-between items-center text-xs opacity-90`}>
              <span>التاريخ: {today}</span>
              <span className="font-bold opacity-70">{theme.pattern} {theme.pattern} {theme.pattern}</span>
              <span>توقيع الأستاذ: ___________</span>
            </div>
          </div>
        </div>

        {/* Phrase counter */}
        <div className="text-center pb-3 text-xs text-gray-400">
          العبارة {phraseIndex + 1} من {phrases.length} • اضغط "عبارة أخرى" للتغيير
        </div>
      </div>
    </div>
  );
}
