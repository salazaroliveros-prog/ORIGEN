#!/usr/bin/env node
/**
 * Deployment script for Vercel
 * Handles environment setup, deployment, and error recovery
 */

const { execSync } = require('child_process');
const { writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');

const PROVERCEL_PROJECT = 'origen-erp-guatemala';

// Common Vercel error fixes
const errorFixes = {
  'should NOT have additional property cache': () => {
    console.log('🔧 Fixing: "should NOT have additional property cache"');
    const vercelPath = resolve(process.cwd(), 'vercel.json');
    if (existsSync(vercelPath)) {
      let content = readFileSync(vercelPath, 'utf-8');
      // Remove cache property if present
      content = content.replace(/,\\s*"cache":\\s*[^}]+/, '');
      content = content.replace(/\\n\\s*"cache":\\s*[^}]+/, '');
      writeFileSync(vercelPath, content);
      console.log('   ✅ vercel.json cleaned');
    }
  },
  
  'invalid request': () => {
    console.log('🔧 Fixing: invalid request error');
    // Try to remove cache from vercel.json
    try {
      execSync('node -e "const fs=require(\"node:fs\");let c=fs.readFileSync(\"./vercel.json\",\"utf-8\");c=c.replace(/,\\s*\"cache\":\\s*[^}]+/, \"\");fs.writeFileSync(\"./vercel.json\",c)"');
      console.log('   ✅ vercel.json cleaned via node');
    } catch (e) {
      console.log('   ⚠️ Could not auto-fix vercel.json');
    }
  }
};

function readFileSync(path, encoding) {
  return require('fs').readFileSync(path, encoding);
}

function deployAttempt(attemptNum = 1) {
  console.log(`\n🚀 Deployment attempt #${attemptNum}...\n`);
  
  try {
    // Set environment for vercel CLI - token from environment variable
    // Make sure to set VERCEL_TOKEN environment variable before running this script
    if (!process.env.VERCEL_TOKEN) {
      console.error('❌ VERCEL_TOKEN environment variable not set');
      console.error('   Set it via: export VERCEL_TOKEN=your_token_or use Vercel Dashboard');
      process.exit(1);
    }
    
    // Run vercel deploy
    const result = execSync('vercel deploy --confirm --token=' + process.env.VERCEL_TOKEN, {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    console.log('✅ Deployment successful!');
    console.log(result);
    return true;
    
  } catch (error) {
    const errorMsg = error.stdout || error.stderr || error.message || 'Unknown error';
    console.error('❌ Deployment failed:');
    console.error(errorMsg);
    
    // Try to fix common errors
    console.log('\n🔧 Attempting to fix errors...\n');
    
    // Check for known error patterns and apply fixes
    if (errorMsg.includes('should NOT have additional property cache')) {
      errorFixes['should NOT have additional property cache']();
    }
    
    if (errorMsg.includes('invalid request')) {
      errorFixes['invalid request']();
    }
    
    // Fix vercel.json if it exists and has cache issue
    const vercelPath = resolve(process.cwd(), 'vercel.json');
    if (existsSync(vercelPath)) {
      let content = readFileSync(vercelPath, 'utf-8');
      if (content.includes('"cache"')) {
        console.log('   📝 Removing cache from vercel.json...');
        content = content.replace(/,\\s*"cache":\\s*[^}]+/, '');
        content = content.replace(/\\n\\s*"cache":\\s*[^}]+/, '');
        writeFileSync(vercelPath, content);
        console.log('   ✅ vercel.json cleaned');
      }
    }
    
    // Retry deployment if not last attempt
    if (attemptNum < 3) {
      console.log(`\n🔄 Retrying deployment in 2 seconds...`);
      setTimeout(() => {
        deployAttempt(attemptNum + 1);
      }, 2000);
    } else {
      console.log('\n❌ Max attempts reached. Deployment failed.');
      process.exit(1);
    }
    
    return false;
  }
}

// Run the deployment
deployAttempt(1);