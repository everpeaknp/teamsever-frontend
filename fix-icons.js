const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (file) => {
  if (file.endsWith('.tsx')) {
    let content = fs.readFileSync(file, 'utf8');
    const regex = /import\s+\*\s+as\s+Icons\s+from\s+["']@radix-ui\/react-icons["'];?/g;
    
    if (regex.test(content)) {
      // Find all Icons.X occurrences
      const matches = [...content.matchAll(/Icons\.([a-zA-Z0-9_]+)/g)];
      const usedIcons = [...new Set(matches.map(m => m[1]))];
      
      if (usedIcons.length > 0) {
        const importStr = `import { ${usedIcons.join(', ')} } from "@radix-ui/react-icons";`;
        content = content.replace(regex, importStr);
        content = content.replace(/Icons\./g, '');
        fs.writeFileSync(file, content);
        console.log(`Updated ${file} with ${usedIcons.length} icons: ${usedIcons.join(', ')}`);
      }
    }
  }
});
