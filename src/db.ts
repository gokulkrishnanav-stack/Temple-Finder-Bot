import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('temples.db');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS temples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- Hindu, Buddhist, Jain, Sikh, Other
    address TEXT,
    city TEXT,
    lat REAL,
    lng REAL,
    opening_hours TEXT,
    ritual_timings TEXT,
    festivals TEXT,
    accessibility TEXT,
    contact TEXT,
    description TEXT,
    image_url TEXT
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER,
    user_id INTEGER,
    rating INTEGER,
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(temple_id) REFERENCES temples(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER,
    title TEXT,
    description TEXT,
    event_date DATETIME,
    FOREIGN KEY(temple_id) REFERENCES temples(id)
  );
`);

// Seed some data if empty
const templeCount = db.prepare('SELECT COUNT(*) as count FROM temples').get() as { count: number };
if (templeCount.count === 0) {
  const insertTemple = db.prepare(`
    INSERT INTO temples (name, type, address, city, lat, lng, opening_hours, ritual_timings, festivals, accessibility, contact, description, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleTemples = [
    ['Dagadusheth Halwai Ganapati Temple', 'Hindu', 'Ganpati Bhavan, 250, Budhwar Peth, Pune', 'Pune', 18.5164, 73.8560, '6:00 AM - 11:00 PM', 'Aarti at 7:30 AM, 1:30 PM, 8:00 PM', 'Ganesh Chaturthi', 'Wheelchair accessible, Parking available', '020 2447 9622', 'One of the most famous Ganesha temples in India.', 'https://picsum.photos/seed/dagadusheth/800/600'],
    ['Chaturshringi Temple', 'Hindu', 'Senapati Bapat Road, Pune', 'Pune', 18.5392, 73.8273, '6:00 AM - 9:00 PM', 'Morning Puja at 7:00 AM', 'Navratri', 'Steps involved, limited accessibility', '020 2565 0555', 'A hill temple dedicated to Goddess Chaturshringi.', 'https://picsum.photos/seed/chaturshringi/800/600'],
    ['Osho Teerth Park (Near Buddhist Center)', 'Buddhist', 'Koregaon Park, Pune', 'Pune', 18.5375, 73.8885, '6:00 AM - 9:00 AM, 3:00 PM - 6:00 PM', 'Meditation sessions', 'Buddha Purnima', 'Wheelchair accessible paths', 'N/A', 'A serene park and meditation space.', 'https://picsum.photos/seed/osho/800/600'],
    ['Katraj Jain Temple', 'Jain', 'Katraj, Pune', 'Pune', 18.4529, 73.8554, '6:00 AM - 9:00 PM', 'Prakshal at 7:00 AM', 'Mahavir Jayanti', 'Wheelchair accessible', 'N/A', 'A beautiful Jain temple complex on a hillock.', 'https://picsum.photos/seed/katrajjain/800/600'],
    ['Gurudwara Guru Nanak Darbar', 'Sikh', 'Camp, Pune', 'Pune', 18.5126, 73.8787, 'Open 24 hours', 'Gurbani Kirtan throughout the day', 'Gurpurab', 'Wheelchair accessible, Langar hall', 'N/A', 'A major spiritual center for the Sikh community in Pune.', 'https://picsum.photos/seed/gurudwara/800/600']
  ];

  for (const temple of sampleTemples) {
    insertTemple.run(...temple);
  }
}

export default db;
