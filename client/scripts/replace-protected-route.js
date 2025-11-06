#!/usr/bin/env node
/**
 * Script to automatically replace ProtectedRoute with ProtectedRouteWrapper
 * in all page.tsx files
 * 
 * Usage:
 *   node scripts/replace-protected-route.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(process.cwd(), 'src', 'app');

function findPageFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and .next
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(fullPath);
        }
      } else if (entry.name === 'page.tsx') {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function replaceProtectedRoute(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let modified = false;
  
  // Replace import statement - handle both single and double quotes
  // Pattern: import ProtectedRoute from '@/components/ProtectedRoute';
  // Also handle: import ProtectedRouteWrapper from '@/components/ProtectedRoute';
  const importPatterns = [
    {
      pattern: /import\s+ProtectedRoute\s+from\s+['"]@\/components\/ProtectedRoute['"];?/g,
      replacement: (match) => {
        const quote = match.includes("'") ? "'" : '"';
        return `import ProtectedRouteWrapper from ${quote}@/components/ProtectedRouteWrapper${quote};`;
      }
    },
    {
      pattern: /import\s+ProtectedRouteWrapper\s+from\s+['"]@\/components\/ProtectedRoute['"];?/g,
      replacement: (match) => {
        const quote = match.includes("'") ? "'" : '"';
        return `import ProtectedRouteWrapper from ${quote}@/components/ProtectedRouteWrapper${quote};`;
      }
    }
  ];
  
  for (const { pattern, replacement } of importPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }
  
  // Replace opening tag <ProtectedRoute (but not <ProtectedRouteWrapper)
  const openTagPattern = /<ProtectedRoute(\s|>)/g;
  content = content.replace(openTagPattern, (match, after) => {
    // Skip if it's already ProtectedRouteWrapper
    if (match.startsWith('<ProtectedRouteWrapper')) {
      return match;
    }
    modified = true;
    return `<ProtectedRouteWrapper${after}`;
  });
  
  // Replace closing tag </ProtectedRoute> (but not </ProtectedRouteWrapper>)
  const closeTagPattern = /<\/ProtectedRoute>/g;
  if (closeTagPattern.test(content)) {
    content = content.replace(closeTagPattern, (match) => {
      // Skip if it's already ProtectedRouteWrapper
      if (match === '</ProtectedRouteWrapper>') {
        return match;
      }
      modified = true;
      return '</ProtectedRouteWrapper>';
    });
  }
  
  if (modified && content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔍 Tìm kiếm các file page.tsx...\n');
  
  const pageFiles = findPageFiles(SRC_DIR);
  console.log(`📁 Tìm thấy ${pageFiles.length} file page.tsx\n`);
  
  let replacedCount = 0;
  const replacedFiles = [];
  
  for (const file of pageFiles) {
    const relativePath = path.relative(process.cwd(), file);
    try {
      if (replaceProtectedRoute(file)) {
        replacedCount++;
        replacedFiles.push(relativePath);
        console.log(`✅ Đã cập nhật: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi xử lý ${relativePath}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Kết quả:`);
  console.log(`   - Tổng số file: ${pageFiles.length}`);
  console.log(`   - Đã cập nhật: ${replacedCount}`);
  console.log(`   - Không thay đổi: ${pageFiles.length - replacedCount}`);
  
  if (replacedFiles.length > 0) {
    console.log(`\n📝 Các file đã được cập nhật:`);
    replacedFiles.forEach(file => console.log(`   - ${file}`));
  }
  
  console.log('\n✨ Hoàn thành!');
}

main();
