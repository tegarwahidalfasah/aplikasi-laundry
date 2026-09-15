#!/usr/bin/env node
/**
 * Script untuk generate password hash bcrypt
 * Cara pakai:
 *   node scripts/generate-password-hash.js <password_anda>
 * 
 * Contoh:
 *   node scripts/generate-password-hash.js mySecretPassword123
 */

const bcrypt = require('bcryptjs');

async function main() {
  const password = process.argv[2];
  
  if (!password) {
    console.error('❌ Error: Password tidak disediakan');
    console.error('Cara pakai: node scripts/generate-password-hash.js <password_anda>');
    process.exit(1);
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    console.log('\n✅ Password hash berhasil dibuat:\n');
    console.log('='.repeat(60));
    console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
    console.log('='.repeat(60));
    console.log('\n📝 Simpan di file .env.local (untuk development):');
    console.log('   ADMIN_USERNAME=admin');
    console.log(`   ADMIN_PASSWORD_HASH="${hash}"`);
    console.log('\n📝 Atau di environment variables Netlify (untuk production)');
    console.log('\n⚠️  JANGAN commit file .env.local ke Git!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
