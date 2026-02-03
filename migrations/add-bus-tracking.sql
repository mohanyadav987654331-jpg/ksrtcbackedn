-- Table to store bus locations history (for tracking and analysis)
CREATE TABLE IF NOT EXISTS bus_locations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  trip_id INT NOT NULL,
  bus_number VARCHAR(50) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  speed DECIMAL(6, 2) DEFAULT 0,  -- Speed in km/h
  accuracy DECIMAL(6, 2) DEFAULT 0,  -- GPS accuracy in meters
  timestamp DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_trip (trip_id),
  INDEX idx_bus_number (bus_number),
  INDEX idx_timestamp (timestamp),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Update trips table to add location tracking columns (if not exists)
ALTER TABLE trips ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10, 8) DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11, 8) DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS last_location_update DATETIME DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS crowd_level VARCHAR(20) DEFAULT 'Low';
ALTER TABLE trips ADD COLUMN IF NOT EXISTS next_stop VARCHAR(255) DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS started_at DATETIME DEFAULT NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS ended_at DATETIME DEFAULT NULL;
