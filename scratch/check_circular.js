
const fs = require('fs');
const path = require('path');

function getImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  const regex = /import\s+.*?\s+from\s+['"](.*?)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function resolveImport(importPath, currentDir) {
  if (importPath.startsWith('@/')) {
    return path.join(process.cwd(), 'src', importPath.slice(2));
  }
  if (importPath.startsWith('.')) {
    return path.join(currentDir, importPath);
  }
  return null; // Ignore node_modules
}

const visited = new Set();
const stack = [];

function findCircular(filePath) {
  const absolutePath = filePath.endsWith('.ts') || filePath.endsWith('.tsx') ? filePath : 
                      (fs.existsSync(filePath + '.ts') ? filePath + '.ts' : 
                      (fs.existsSync(filePath + '.tsx') ? filePath + '.tsx' : 
                      (fs.existsSync(path.join(filePath, 'index.ts')) ? path.join(filePath, 'index.ts') : filePath)));
  
  if (!fs.existsSync(absolutePath)) return;

  if (stack.includes(absolutePath)) {
    console.log('Circular dependency detected:');
    console.log(stack.slice(stack.indexOf(absolutePath)).join(' -> ') + ' -> ' + absolutePath);
    return;
  }

  if (visited.has(absolutePath)) return;

  visited.add(absolutePath);
  stack.push(absolutePath);

  const currentDir = path.dirname(absolutePath);
  const imports = getImports(absolutePath);

  for (const imp of imports) {
    const resolved = resolveImport(imp, currentDir);
    if (resolved) {
      findCircular(resolved);
    }
  }

  stack.pop();
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        scanDir(fullPath);
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      findCircular(fullPath);
    }
  }
}

scanDir(path.join(process.cwd(), 'src'));
