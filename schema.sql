-- KSRTC Smart Transportation System - Database Schema

-- Optional full reset (uncomment if you want a clean slate)
-- DROP DATABASE IF EXISTS ksrtc_smart_transport;
-- Drop conflicting tables to ensure schema consistency
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS passes;
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS buses;
DROP TABLE IF EXISTS drivers;
DROP TABLE IF EXISTS route_stops;
DROP TABLE IF EXISTS stops;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS depots;
DROP TABLE IF EXISTS users;

-- Create database
CREATE DATABASE IF NOT EXISTS ksrtc_smart_transport;
USE ksrtc_smart_transport;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(20),
  role ENUM('user', 'driver', 'depot_admin', 'super_admin') DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- Depots table
CREATE TABLE IF NOT EXISTS depots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  depot_name VARCHAR(100) NOT NULL,
  location VARCHAR(255),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes table
CREATE TABLE IF NOT EXISTS routes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id VARCHAR(20) UNIQUE NOT NULL,
  route_name VARCHAR(100) NOT NULL,
  origin VARCHAR(100) NOT NULL,
  destination VARCHAR(100) NOT NULL,
  distance DECIMAL(10, 2),
  estimated_duration INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_route_id (route_id)
);

-- Route Stops table (string route_id, matches sample_data.sql)
CREATE TABLE IF NOT EXISTS route_stops (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id VARCHAR(20) NOT NULL,
  stop_name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  stop_order INT NOT NULL,
  estimated_minutes_from_origin INT DEFAULT 0,
  FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
  INDEX idx_route_id (route_id)
);

-- Buses table
CREATE TABLE IF NOT EXISTS buses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bus_number VARCHAR(20) UNIQUE NOT NULL,
  bus_type ENUM('NORMAL', 'EXPRESS', 'DELUXE', 'SLEEPER') DEFAULT 'NORMAL',
  route_id INT,
  depot_id INT,
  capacity INT DEFAULT 50,
  driver_id INT,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  crowd_level INT DEFAULT 0,
  next_stop VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  FOREIGN KEY (depot_id) REFERENCES depots(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_bus_number (bus_number),
  INDEX idx_route_id (route_id),
  INDEX idx_status (status)
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  route_id INT NOT NULL,
  bus_id INT,
  driver_id INT,
  departure_time TIME NOT NULL,
  arrival_time TIME,
  days_of_week VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE SET NULL,
  FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_route_id (route_id),
  INDEX idx_departure_time (departure_time)
);

-- Passes table
CREATE TABLE IF NOT EXISTS passes (
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
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  bus_id INT,
  route_id INT,
  category VARCHAR(50),
  rating INT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  admin_response TEXT,
  status ENUM('PENDING', 'IN_PROGRESS', 'RESOLVED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE SET NULL,
  FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
);

-- Insert sample depot
INSERT INTO depots (depot_name, location, latitude, longitude, phone) VALUES
('Bangalore Central Depot', 'Majestic, Bangalore', 12.9716, 77.5946, '080-22222222');

-- Insert sample routes
INSERT INTO routes (route_id, route_name, origin, destination, distance, estimated_duration) VALUES
('R001', 'Bangalore - Mysore Express', 'Bangalore', 'Mysore', 150.5, 180),
('R002', 'Bangalore - Mangalore Highway', 'Bangalore', 'Mangalore', 352.0, 420),
('R003', 'Bangalore - Hubli Express', 'Bangalore', 'Hubli', 410.0, 480);

-- Insert sample stops for R001
INSERT INTO route_stops (route_id, stop_name, latitude, longitude, stop_order, estimated_minutes_from_origin) VALUES
('R001', 'Bangalore Central', 12.9716, 77.5946, 1, 0),
('R001', 'Bidadi', 12.7999, 77.3996, 2, 30),
('R001', 'Ramanagara', 12.7175, 77.2816, 3, 45),
('R001', 'Channapatna', 12.6515, 76.9766, 4, 60),
('R001', 'Mandya', 12.5244, 76.8951, 5, 90),
('R001', 'Srirangapatna', 12.4167, 76.6833, 6, 120),
('R001', 'Mysore', 12.2958, 76.6394, 7, 180);

-- Insert sample buses
INSERT INTO buses (bus_number, bus_type, route_id, depot_id, capacity, current_lat, current_lng, status) VALUES
('KA-57-F-1001', 'EXPRESS', 1, 1, 40, 12.9716, 77.5946, 'AVAILABLE'),
('KA-57-F-1002', 'NORMAL', 1, 1, 50, 12.9716, 77.5946, 'AVAILABLE'),
('KA-57-F-1003', 'EXPRESS', 2, 1, 40, 12.9716, 77.5946, 'AVAILABLE'),
('KA-57-F-1004', 'DELUXE', 3, 1, 35, 12.9716, 77.5946, 'AVAILABLE');

-- Insert sample schedules
INSERT INTO schedules (route_id, bus_id, departure_time, arrival_time, days_of_week) VALUES
(1, 1, '06:00:00', '09:00:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
(1, 2, '09:00:00', '12:00:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
(2, 3, '07:00:00', '14:00:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'),
(3, 4, '08:00:00', '16:00:00', 'Mon,Tue,Wed,Thu,Fri,Sat,Sun');

-- Create test user account (password: Test@123, hashed with bcryptjs)
-- You'll need to register through the app or API to get proper password hash
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('testuser', 'testuser@example.com', '$2a$10$placeholder', 'Test User', '9876543210', 'user');

-- Create depot admin sample (password placeholder -> update via script)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('depotadmin', 'depotadmin@example.com', '$2a$10$placeholder', 'Depot Admin', '9876500001', 'depot_admin');

-- Verification queries
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Depots:', COUNT(*) FROM depots
UNION ALL
SELECT 'Routes:', COUNT(*) FROM routes
UNION ALL
SELECT 'Route Stops:', COUNT(*) FROM route_stops
UNION ALL
SELECT 'Buses:', COUNT(*) FROM buses
UNION ALL
SELECT 'Schedules:', COUNT(*) FROM schedules;
