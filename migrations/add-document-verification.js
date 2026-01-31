const db = require('../config/database');

async function addDocumentVerificationColumns() {
  try {
    console.log('🔧 Adding document verification columns to passes table...');

    // Check if columns already exist
    const [columns] = await db.query(
      `SHOW COLUMNS FROM passes LIKE 'document_type'`
    );

    if (columns.length > 0) {
      console.log('✓ Document verification columns already exist');
      return;
    }

    // Add document_type column
    await db.query(`
      ALTER TABLE passes 
      ADD COLUMN document_type VARCHAR(50) NULL AFTER transaction_id
    `);
    console.log('✓ Added document_type column');

    // Add document_last_digits column
    await db.query(`
      ALTER TABLE passes 
      ADD COLUMN document_last_digits VARCHAR(4) NULL AFTER document_type
    `);
    console.log('✓ Added document_last_digits column');

    console.log('✅ Document verification columns added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addDocumentVerificationColumns();
