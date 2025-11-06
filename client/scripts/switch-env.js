#!/usr/bin/env node
/**
 * Script to switch between development and production environments
 * Cross-platform compatible (Windows, Linux, macOS)
 * 
 * Usage:
 *   node scripts/switch-env.js dev    -> Switch to development
 *   node scripts/switch-env.js prod    -> Switch to production
 *   node scripts/switch-env.js info   -> Show current environment
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ENV_FILES = {
  local: '.env.local',
  dev: '.env.development',
  prod: '.env.production',
  example: '.env.example',
};

const BACKUP_DIR = '.env-backups';

function getEnvPath(filename) {
  return path.join(process.cwd(), filename);
}

function ensureBackupDir() {
  const backupPath = path.join(process.cwd(), BACKUP_DIR);
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
}

function backupCurrentEnv() {
  ensureBackupDir();
  const localPath = getEnvPath(ENV_FILES.local);
  if (fs.existsSync(localPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), BACKUP_DIR, `.env.local.${timestamp}`);
    try {
      fs.copyFileSync(localPath, backupPath);
      console.log(`✅ Backed up current .env.local`);
      console.log(`   Backup location: ${backupPath}`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not backup .env.local: ${error.message}`);
    }
  }
}

function switchToDev() {
  console.log('🔄 Switching to DEVELOPMENT environment...');
  backupCurrentEnv();
  
  const devPath = getEnvPath(ENV_FILES.dev);
  const localPath = getEnvPath(ENV_FILES.local);
  
  if (fs.existsSync(devPath)) {
    try {
      fs.copyFileSync(devPath, localPath);
      console.log('✅ Switched to development environment');
      console.log('📍 API URL: http://localhost:8000');
      console.log(`\n💡 Tip: Edit ${ENV_FILES.local} to customize your local settings`);
    } catch (error) {
      console.error(`❌ Error switching to development: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ .env.development file not found at: ${devPath}`);
    console.error('   Please create .env.development file first');
    process.exit(1);
  }
}

function switchToProd() {
  console.log('🔄 Switching to PRODUCTION environment...');
  backupCurrentEnv();
  
  const prodPath = getEnvPath(ENV_FILES.prod);
  const localPath = getEnvPath(ENV_FILES.local);
  
  if (fs.existsSync(prodPath)) {
    try {
      fs.copyFileSync(prodPath, localPath);
      console.log('✅ Switched to production environment');
      const content = fs.readFileSync(localPath, 'utf8');
      const apiUrlMatch = content.match(/NEXT_PUBLIC_API_URL=(.+)/);
      if (apiUrlMatch) {
        console.log(`📍 API URL: ${apiUrlMatch[1].trim()}`);
      }
      console.log(`\n💡 Tip: Edit ${ENV_FILES.local} to update production URL`);
    } catch (error) {
      console.error(`❌ Error switching to production: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.error(`❌ .env.production file not found at: ${prodPath}`);
    console.error('   Please create .env.production file first');
    process.exit(1);
  }
}

function showInfo() {
  console.log('\n📋 Current Environment Configuration:\n');
  
  const localPath = getEnvPath(ENV_FILES.local);
  const devPath = getEnvPath(ENV_FILES.dev);
  const prodPath = getEnvPath(ENV_FILES.prod);
  
  // Show platform info
  console.log(`Platform: ${os.platform()} (${os.arch()})`);
  console.log(`Working directory: ${process.cwd()}\n`);
  
  // Check which env files exist
  const existingFiles = [];
  if (fs.existsSync(devPath)) existingFiles.push('✅ .env.development');
  else existingFiles.push('❌ .env.development (not found)');
  
  if (fs.existsSync(prodPath)) existingFiles.push('✅ .env.production');
  else existingFiles.push('❌ .env.production (not found)');
  
  if (fs.existsSync(localPath)) existingFiles.push('✅ .env.local');
  else existingFiles.push('❌ .env.local (not found)');
  
  console.log('Environment files:');
  existingFiles.forEach(file => console.log(`  ${file}`));
  console.log('');
  
  // Show current config from .env.local
  if (fs.existsSync(localPath)) {
    try {
      const content = fs.readFileSync(localPath, 'utf8');
      const apiUrlMatch = content.match(/NEXT_PUBLIC_API_URL=(.+)/);
      const nextAuthUrlMatch = content.match(/NEXTAUTH_URL=(.+)/);
      
      console.log('Current configuration (.env.local):');
      if (apiUrlMatch) {
        const apiUrl = apiUrlMatch[1].trim();
        console.log(`  API URL: ${apiUrl}`);
        
        // Detect environment type
        if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
          console.log('  Environment: 🟢 DEVELOPMENT');
        } else if (apiUrl.includes('render.com') || apiUrl.includes('onrender.com') || apiUrl.includes('https://')) {
          console.log('  Environment: 🔴 PRODUCTION');
        } else {
          console.log('  Environment: ⚪ UNKNOWN');
        }
      }
      if (nextAuthUrlMatch) {
        console.log(`  NextAuth URL: ${nextAuthUrlMatch[1].trim()}`);
      }
    } catch (error) {
      console.error(`  Error reading .env.local: ${error.message}`);
    }
  } else {
    console.log('⚠️  .env.local not found');
    console.log('   Using default environment variables from Next.js');
  }
  
  console.log('\nAvailable commands:');
  console.log('  npm run env:dev   or  node scripts/switch-env.js dev');
  console.log('  npm run env:prod  or  node scripts/switch-env.js prod');
  console.log('  npm run env:info  or  node scripts/switch-env.js info\n');
}

// Main
const command = process.argv[2]?.toLowerCase();

switch (command) {
  case 'dev':
  case 'development':
    switchToDev();
    break;
  case 'prod':
  case 'production':
    switchToProd();
    break;
  case 'info':
  case 'status':
  case 'show':
    showInfo();
    break;
  default:
    console.log('Usage: node scripts/switch-env.js [dev|prod|info]');
    console.log('\nCommands:');
    console.log('  dev    Switch to development environment');
    console.log('  prod   Switch to production environment');
    console.log('  info   Show current environment configuration');
    console.log('\nOr use npm scripts:');
    console.log('  npm run env:dev');
    console.log('  npm run env:prod');
    console.log('  npm run env:info');
    process.exit(1);
}

