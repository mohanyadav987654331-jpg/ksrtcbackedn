const mysql = require('mysql2/promise');
const fs = require('fs');

async function exportDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    const [rows] = await connection.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'ksrtc_smart_transport'`
    );

    let sql = '-- KSRTC Smart Transport Database Backup\n\n';

    for (const row of rows) {
      const tableName = row.TABLE_NAME;
      
      // Get CREATE TABLE statement
      const [createTable] = await connection.execute(`SHOW CREATE TABLE ${tableName}`);
      sql += `\n${createTable[0]['Create Table']};\n`;

      // Get all data
      const [data] = await connection.execute(`SELECT * FROM ${tableName}`);
      
      if (data.length > 0) {
        const columns = Object.keys(data[0]).join(', ');
        for (const row of data) {
          const values = Object.values(row).map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
            return v;
          }).join(', ');
          sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
        }
      }
    }

    fs.writeFileSync('d:\\SRP\\backend\\backup.sql', sql);
    console.log('✅ Database exported to backup.sql');
    connection.end();
  } catch (err) {
    console.error('❌ Export failed:', err.message);
  }
}

exportDatabase();
