const mysql = require('mysql2/promise');

async function fixPassesTable() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'ksrtc_smart_transport'
  });

  try {
    console.log('🔧 Fixing database schema...\n');

    // Check if users table exists
    const [userTables] = await conn.query("SHOW TABLES LIKE 'users'");
    
    if (userTables.length === 0) {
      console.log('📋 Creating users table...');
      await conn.query(`
        CREATE TABLE users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(100) NOT NULL UNIQUE,
          email VARCHAR(150),
          password VARCHAR(255) NOT NULL,
          full_name VARCHAR(150),
          phone VARCHAR(20),
          role ENUM('user', 'driver', 'depot_admin', 'super_admin') DEFAULT 'user',
          depot_id INT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_email (email),
          INDEX idx_role (role)
        )
      `);
      console.log('✅ Users table created');

      // Insert test user if doesn't exist
      await conn.query(`
        INSERT IGNORE INTO users (id, username, email, password, full_name, role) 
        VALUES (1, 'testuser', 'test@example.com', 'password123', 'Test User', 'user')
      `);
      console.log('✅ Test user created');
    } else {
      console.log('✅ Users table exists');
    }

    // Check if passes table exists
    const [tables] = await conn.query("SHOW TABLES LIKE 'passes'");
    
    if (tables.length > 0) {
      console.log('📋 Passes table exists, checking columns...');
      
      // Get existing columns
      const [columns] = await conn.query("SHOW COLUMNS FROM passes");
      const existingColumns = columns.map(c => c.Field);
      console.log('Existing columns:', existingColumns.join(', '));

      // Add missing columns one by one
      const columnsToAdd = [
        { name: 'amount', def: 'DECIMAL(10, 2) NULL AFTER fare' },
        { name: 'start_date', def: 'DATE NULL AFTER purchase_date' },
        { name: 'end_date', def: 'DATE NULL AFTER start_date' },
        { name: 'payment_status', def: "VARCHAR(50) DEFAULT 'pending' AFTER transaction_id" },
        { name: 'document_type', def: 'VARCHAR(100) NULL AFTER payment_status' },
        { name: 'document_number', def: 'VARCHAR(100) NULL AFTER document_type' },
        { name: 'document_last_digits', def: 'VARCHAR(10) NULL AFTER document_number' },
        { name: 'is_approved', def: 'TINYINT DEFAULT 0 AFTER document_last_digits' }
      ];

      for (const col of columnsToAdd) {
        if (!existingColumns.includes(col.name)) {
          try {
            await conn.query(`ALTER TABLE passes ADD COLUMN ${col.name} ${col.def}`);
            console.log(`✅ Added column: ${col.name}`);
          } catch (err) {
            console.log(`⚠️  Column ${col.name}: ${err.message}`);
          }
        } else {
          console.log(`✓ Column ${col.name} already exists`);
        }
      }

      // Add indexes
      try {
        await conn.query('CREATE INDEX idx_payment_status ON passes(payment_status)');
        console.log('✅ Added index: idx_payment_status');
      } catch (err) {
        if (!err.message.includes('Duplicate key name')) {
          console.log('⚠️  Index payment_status:', err.message);
        }
      }

      try {
        await conn.query('CREATE INDEX idx_end_date ON passes(end_date)');
        console.log('✅ Added index: idx_end_date');
      } catch (err) {
        if (!err.message.includes('Duplicate key name')) {
          console.log('⚠️  Index end_date:', err.message);
        }
      }

    } else {
      console.log('❌ Passes table does not exist, creating...');
      
      // Create complete passes table
      await conn.query(`
        CREATE TABLE passes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          pass_type ENUM('DAILY', 'WEEKLY', 'MONTHLY') NOT NULL,
          origin VARCHAR(100) NOT NULL,
          destination VARCHAR(100) NOT NULL,
          distance DECIMAL(10, 2) DEFAULT 0,
          fare DECIMAL(10, 2) NOT NULL,
          amount DECIMAL(10, 2) NULL,
          purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          start_date DATE NULL,
          end_date DATE NULL,
          valid_from DATE NOT NULL,
          valid_until DATE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          payment_method VARCHAR(50),
          transaction_id VARCHAR(100),
          payment_status VARCHAR(50) DEFAULT 'pending',
          document_type VARCHAR(100),
          document_number VARCHAR(100),
          document_last_digits VARCHAR(10),
          is_approved TINYINT DEFAULT 0,
          co2_saved DECIMAL(10, 2) DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_user_id (user_id),
          INDEX idx_valid_dates (valid_from, valid_until),
          INDEX idx_payment_status (payment_status),
          INDEX idx_end_date (end_date)
        )
      `);
      console.log('✅ Passes table created successfully');
    }

    // Verify final structure
    console.log('\n📊 Final table structure:');
    const [finalColumns] = await conn.query("SHOW COLUMNS FROM passes");
    finalColumns.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Test insert and select
    console.log('\n🧪 Testing insert and select...');
    const testData = {
      user_id: 1,
      pass_type: 'DAILY',
      origin: 'Bangalore',
      destination: 'Mysore',
      fare: 250,
      amount: 250,
      start_date: '2026-01-27',
      end_date: '2026-01-28',
      valid_from: '2026-01-27',
      valid_until: '2026-01-28',
      payment_method: 'UPI',
      transaction_id: `TEST-${Date.now()}`,
      payment_status: 'completed',
      is_approved: 1
    };

    const [insertResult] = await conn.query('INSERT INTO passes SET ?', testData);
    console.log(`✅ Test insert successful, ID: ${insertResult.insertId}`);

    const [selectResult] = await conn.query(
      'SELECT id, pass_type, origin, destination, start_date, end_date, payment_status FROM passes WHERE id = ?',
      [insertResult.insertId]
    );
    console.log('✅ Test select successful:', selectResult[0]);

    // Clean up test data
    await conn.query('DELETE FROM passes WHERE transaction_id LIKE "TEST-%"');
    console.log('✅ Test data cleaned up');

    console.log('\n✅ Passes table is ready!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await conn.end();
  }
}

fixPassesTable();
