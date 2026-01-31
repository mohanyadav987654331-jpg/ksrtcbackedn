const db = require('./config/database');

(async () => {
  try {
    console.log('🔧 Updating buses with missing number_plate...');
    
    const [result] = await db.query(`
      UPDATE buses 
      SET number_plate = bus_number 
      WHERE number_plate IS NULL OR number_plate = ''
    `);
    
    console.log(`✅ Updated ${result.affectedRows} buses with number_plate = bus_number`);
    
    const [buses] = await db.query('SELECT bus_number, number_plate FROM buses LIMIT 10');
    console.log('📋 Sample buses:', buses);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
