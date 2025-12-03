// Database migration script to add email verification columns
const Database = require('better-sqlite3');

console.log('Starting database migration...');

const db = new Database('tasks.db');

try {
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  console.log('Current columns:', columnNames);

  // Add missing columns if they don't exist
  if (!columnNames.includes('email_verified')) {
    db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0');
    console.log('✓ Added email_verified column');
  }

  if (!columnNames.includes('verification_token')) {
    db.exec('ALTER TABLE users ADD COLUMN verification_token TEXT');
    console.log('✓ Added verification_token column');
  }

  if (!columnNames.includes('verification_token_expires')) {
    db.exec('ALTER TABLE users ADD COLUMN verification_token_expires DATETIME');
    console.log('✓ Added verification_token_expires column');
  }

  if (!columnNames.includes('reset_token')) {
    db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT');
    console.log('✓ Added reset_token column');
  }

  if (!columnNames.includes('reset_token_expires')) {
    db.exec('ALTER TABLE users ADD COLUMN reset_token_expires DATETIME');
    console.log('✓ Added reset_token_expires column');
  }

  console.log('\n✅ Migration completed successfully!');
  console.log('You can now restart your backend server.\n');

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}
