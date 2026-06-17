const fs = require('fs'); 
const files = ['src/App.jsx', 'src/components/ParentPortal.jsx']; 
files.forEach(file => { 
  let content = fs.readFileSync(file, 'utf8'); 
  content = content.replace(/'ممتاز'/g, "'جيد'"); 
  content = content.replace(/'مراجعة'/g, "'يحتاج الى ترسيخ'"); 
  content = content.replace(/'ضعيف'/g, "'حفظ غير متقن'"); 
  content = content.replace(/>ممتاز</g, ">جيد<"); 
  content = content.replace(/>مراجعة</g, ">يحتاج الى ترسيخ<"); 
  content = content.replace(/>ضعيف</g, ">حفظ غير متقن<"); 
  fs.writeFileSync(file, content); 
});
