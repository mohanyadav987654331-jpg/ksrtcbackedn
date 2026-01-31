const db = require('./config/database');
(async()=>{
  try {
    const [buses]=await db.query('SELECT id,depot_id,bus_number FROM buses WHERE depot_id=33 LIMIT 5');
    console.log('Buses depot 33:', buses);
    const [drivers]=await db.query('SELECT id,depot_id,name FROM drivers WHERE depot_id=33 LIMIT 5');
    console.log('Drivers depot 33:', drivers);
  } catch(err){
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
