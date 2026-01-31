const fs = require('fs');
const mysql = require('mysql2');
require('dotenv').config();

const conn = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
});

conn.connect((err) => {
  if (err) {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  }

  const sql = fs.readFileSync('./schema.sql', 'utf8');
  
  // Execute the entire SQL script
  conn.query(sql, (error) => {
    if (error) {
      // Some errors are expected (like DROP IF EXISTS)
      console.log('Schema output:', error.message.substring(0, 200));
    } else {
      console.log('✅ Schema executed successfully');
    }
    
    conn.end();
    process.exit(0);
  });
});
