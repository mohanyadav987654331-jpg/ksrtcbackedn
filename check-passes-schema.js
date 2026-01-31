const mysql = require('mysql2');

const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'ksrtc'
});

conn.connect(err => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  }

  // Check passes table
  conn.query('DESCRIBE passes', (err, results) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('\n✅ Passes table columns:');
      results.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });
      
      // Check required columns
      const requiredCols = ['payment_status', 'amount', 'start_date', 'end_date', 'document_type', 'is_approved'];
      const foundCols = results.map(r => r.Field);
      const missing = requiredCols.filter(c => !foundCols.includes(c));
      
      if (missing.length > 0) {
        console.log('\n❌ Missing columns:', missing.join(', '));
      } else {
        console.log('\n✅ All required columns present!');
      }
    }
    
    conn.end();
  });
});
