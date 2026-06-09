const fs = require('fs');
const files = [
  'src/components/AuditLogs.ts',
  'src/components/Settings.ts',
  'src/components/Users.ts',
  'src/components/Payments.ts',
  'src/services/PdfGenerator.ts',
  'src/components/Reports.ts'
];
files.forEach(f => {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.split('\\${').join('${');
    fs.writeFileSync(f, content);
  }
});
console.log('Fixed interpolation strings.');
