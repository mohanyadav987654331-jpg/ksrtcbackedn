const mysql = require('mysql2/promise');

async function updateBusTimes() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ksrtc_smart_transport'
    });

    console.log('🔄 Updating bus schedules to start at 4:30 AM...');

    // Get all schedules
    const [schedules] = await connection.execute(
      'SELECT id, departure_time, arrival_time FROM schedules'
    );

    console.log(`📊 Found ${schedules.length} schedules to update`);

    let updated = 0;
    
    for (const schedule of schedules) {
      const oldDeparture = schedule.departure_time;
      
      // Parse time
      const [hours, minutes, seconds] = oldDeparture.split(':');
      const totalMinutes = parseInt(hours) * 60 + parseInt(minutes);
      
      // If the bus starts at 5:00 AM (300 minutes), shift it to 4:30 AM (270 minutes)
      // This means subtracting 30 minutes from all times
      const newTotalMinutes = totalMinutes - 30;
      
      if (newTotalMinutes >= 0) {
        const newHours = Math.floor(newTotalMinutes / 60);
        const newMinutes = newTotalMinutes % 60;
        const newDeparture = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:00`;
        
        // Also update arrival time
        const [arrHours, arrMinutes] = schedule.arrival_time.split(':');
        const arrTotalMinutes = parseInt(arrHours) * 60 + parseInt(arrMinutes) - 30;
        const newArrHours = Math.floor(arrTotalMinutes / 60);
        const newArrMinutes = arrTotalMinutes % 60;
        const newArrival = `${newArrHours.toString().padStart(2, '0')}:${newArrMinutes.toString().padStart(2, '0')}:00`;
        
        await connection.execute(
          'UPDATE schedules SET departure_time = ?, arrival_time = ? WHERE id = ?',
          [newDeparture, newArrival, schedule.id]
        );
        
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} schedules`);
    console.log('✅ All bus times now start 30 minutes earlier (4:30 AM instead of 5:00 AM)');

  } catch (error) {
    console.error('❌ Error updating bus times:', error);
  } finally {
    if (connection) await connection.end();
  }
}

updateBusTimes();
