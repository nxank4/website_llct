#!/usr/bin/env node
/**
 * Script to automatically add 'export const dynamic = "force-dynamic";'
 * to all page.tsx files that use ProtectedRouteWrapper
 * 
 * Usage:
 *   node scripts/add-dynamic-export.js
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

function addDynamicExport(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  
  // Check if file uses ProtectedRouteWrapper
  const usesProtectedRoute = /ProtectedRouteWrapper/.test(content);
  
  if (!usesProtectedRoute) {
    return false;
  }
  
  // Check if dynamic export already exists
  if (/export\s+const\s+dynamic\s*=/.test(content)) {
    return false;
  }
  
  // Find the position after 'use client' directive
  const useClientPattern = /(['"]use\s+client['"];?\s*\n?)/;
  const match = content.match(useClientPattern);
  
  if (match) {
    // Add after 'use client' directive
    const insertPosition = match.index + match[0].length;
    const dynamicExport = "\n// Disable static generation for this page\n" + 
                         "export const dynamic = 'force-dynamic';\n";
    content = content.slice(0, insertPosition) + dynamicExport + content.slice(insertPosition);
  } else {
    // If no 'use client', add at the beginning after imports
    const importPattern = /(import\s+.*?from\s+['"].*?['"];?\s*\n)+/g;
    const importMatch = content.match(importPattern);
    
    if (importMatch) {
      const insertPosition = importMatch.index + importMatch[0].length;
      const dynamicExport = "\n// Disable static generation for this page\nexport const dynamic = 'force-dynamic';\n\n";
      content = content.slice(0, insertPosition) + dynamicExport + content.slice(insertPosition);
    } else {
      // Add at the very beginning
      content = "// Disable static generation for this page\nexport const dynamic = 'force-dynamic';\n\n" + content;
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

function main() {
  console.log('🔍 Tìm kiếm các file page.tsx sử dụng ProtectedRouteWrapper...\n');
  
  const pageFiles = findPageFiles(SRC_DIR);
  console.log(`📁 Tìm thấy ${pageFiles.length} file page.tsx\n`);
  
  let updatedCount = 0;
  const updatedFiles = [];
  
  for (const file of pageFiles) {
    const relativePath = path.relative(process.cwd(), file);
    try {
      if (addDynamicExport(file)) {
        updatedCount++;
        updatedFiles.push(relativePath);
        console.log(`✅ Đã thêm dynamic export: ${relativePath}`);
      }
    } catch (error) {
      console.error(`❌ Lỗi khi xử lý ${relativePath}: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Kết quả:`);
  console.log(`   - Tổng số file: ${pageFiles.length}`);
  console.log(`   - Đã cập nhật: ${updatedCount}`);
  console.log(`   - Không thay đổi: ${pageFiles.length - updatedCount}`);
  
  if (updatedFiles.length > 0) {
    console.log(`\n📝 Các file đã được cập nhật:`);
    updatedFiles.forEach(file => console.log(`   - ${file}`));
  }
  
  console.log('\n✨ Hoàn thành!');
}

main();

