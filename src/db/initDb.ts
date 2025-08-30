import initSqlJs, { Database } from 'sql.js';
// Vite will bundle the wasm and give us a URL
// @ts-ignore
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/** Build and seed the in-memory SQLite DB. */
export default async function initDb(): Promise<Database> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database();

  // --- Schema ---
  db.run(`
    PRAGMA foreign_keys=OFF;

    CREATE TABLE IF NOT EXISTS shift_logs(
      employee_id   INT,
      employee_name TEXT,
      role          TEXT,
      date          TEXT,   -- YYYY-MM-DD
      clock_in      TEXT,   -- HH:MM
      clock_out     TEXT    -- HH:MM or NULL
    );

    CREATE TABLE IF NOT EXISTS access_logs(
      employee_id INT,
      event_time  TEXT,   -- YYYY-MM-DD HH:MM
      action      TEXT,   -- OPEN, DENY
      door        TEXT
    );

    CREATE TABLE IF NOT EXISTS pos_sessions(
      employee_id INT,
      login_time  TEXT,   -- YYYY-MM-DD HH:MM
      logout_time TEXT
    );

    CREATE TABLE IF NOT EXISTS insurance_claims(
      business     TEXT,
      claim_id     TEXT,
      created_at   TEXT,
      submitted_at TEXT,
      amount       REAL,
      prepared_by  TEXT
    );

    CREATE TABLE IF NOT EXISTS insurance_drafts(
      business    TEXT,
      claim_id    TEXT,
      version     INT,
      created_at  TEXT,
      prepared_by TEXT
    );

    CREATE TABLE IF NOT EXISTS police_reports(
      suspect   TEXT,
      date      TEXT,
      arrest_time TEXT,
      location  TEXT
    );
  `);

  // --- Seed: employees we'll reference across tables ---
  // 1..10 for consistency with chapters
  // Names/roles
  const people = [
    [1, 'Alex Vega',   'Bartender'],
    [2, 'Mina Park',   'Server'],
    [3, 'Jonah Ruiz',  'Manager'],
    [4, 'Priya Desai', 'Cook'],
    [5, 'Omar Haddad', 'Security'],
    [6, 'Riley Chen',  'Server'],
    [7, 'Lana Ortiz',  'Barback'],
    [8, 'Theo Maas',   'Cook'],
    [9, 'Nina Volkov', 'Server'],
    [10,'Gabe Silva',  'Dish']
  ] as const;

  // Helper to insert a shift row
  const s = db.prepare(
    `INSERT INTO shift_logs(employee_id, employee_name, role, date, clock_in, clock_out)
     VALUES(?,?,?,?,?,?)`
  );

  // Some late-July shifts so "last 30 days" windows have data (>= 2025-07-28)
  const julyTail: Array<[number,string,string,string,string,string|null]> = [
    [1,'Alex Vega','Bartender','2025-07-30','17:00','23:10'],
    [2,'Mina Park','Server','2025-07-30','16:30','22:00'],
    [5,'Omar Haddad','Security','2025-07-30','20:00','23:30']
  ];

  // August spread, including the fire date 2025-08-27 with a couple NULL clock_outs
  const aug: Array<[number,string,string,string,string,string|null]> = [
    [1,'Alex Vega','Bartender','2025-08-01','17:00','22:40'],
    [2,'Mina Park','Server','2025-08-02','16:30','22:05'],
    [3,'Jonah Ruiz','Manager','2025-08-03','18:00','23:20'],
    [4,'Priya Desai','Cook','2025-08-05','15:00','22:10'],
    [5,'Omar Haddad','Security','2025-08-06','20:00','23:45'],
    [6,'Riley Chen','Server','2025-08-08','18:30','22:15'],
    [7,'Lana Ortiz','Barback','2025-08-10','19:00','23:05'],
    [8,'Theo Maas','Cook','2025-08-12','14:00','20:30'],
    [9,'Nina Volkov','Server','2025-08-15','18:30','22:30'],
    [10,'Gabe Silva','Dish','2025-08-18','17:15','21:45'],

    // Fire date 2025-08-27
    [1,'Alex Vega','Bartender','2025-08-27','18:00','23:45'],
    [2,'Mina Park','Server','2025-08-27','17:00','22:10'],
    [3,'Jonah Ruiz','Manager','2025-08-27','19:00',null],         // NULL out
    [4,'Priya Desai','Cook','2025-08-27','16:00','23:10'],
    [5,'Omar Haddad','Security','2025-08-27','20:00','23:55'],     // latest out
    [6,'Riley Chen','Server','2025-08-27','21:00','22:30'],
    [7,'Lana Ortiz','Barback','2025-08-27','22:15',null],          // NULL out
    [8,'Theo Maas','Cook','2025-08-27','14:00','20:30'],
    [9,'Nina Volkov','Server','2025-08-27','18:30','22:45'],
    [10,'Gabe Silva','Dish','2025-08-27','17:15','21:50'],

    // A few more August dates
    [1,'Alex Vega','Bartender','2025-08-28','18:00','22:55'],
    [2,'Mina Park','Server','2025-08-28','16:30','22:00'],
    [4,'Priya Desai','Cook','2025-08-29','15:00','23:20'],
    [5,'Omar Haddad','Security','2025-08-29','20:00','23:40'],
    [6,'Riley Chen','Server','2025-08-30','18:45','22:10'],
    [7,'Lana Ortiz','Barback','2025-08-30','19:15','23:05'],
    [8,'Theo Maas','Cook','2025-08-31','14:00','20:00'],
    [9,'Nina Volkov','Server','2025-08-31','18:00','22:25']
  ];

  for (const row of [...julyTail, ...aug]) s.run(row);
  s.free();

  // --- Seed: access_logs (some missing on fire date to support NOT EXISTS steps) ---
  const a = db.prepare(
    `INSERT INTO access_logs(employee_id, event_time, action, door) VALUES(?,?,?,?)`
  );

  // Prior events
  a.run([1,'2025-08-01 16:58','OPEN','Back Door']);
  a.run([5,'2025-08-06 19:55','OPEN','Alley']);
  a.run([7,'2025-08-10 18:50','OPEN','Front']);
  a.run([3,'2025-08-03 17:35','OPEN','Office']);

  // Fire date events (omit for 3=Jonah and 7=Lana to create "no door entry" cases)
  a.run([1,'2025-08-27 17:59','OPEN','Back Door']);
  a.run([2,'2025-08-27 16:55','OPEN','Front']);
  // (no row for employee 3)
  a.run([4,'2025-08-27 15:10','OPEN','Kitchen']);
  a.run([5,'2025-08-27 19:50','OPEN','Alley']);
  a.run([6,'2025-08-27 20:55','OPEN','Front']);
  // (no row for employee 7)
  a.run([8,'2025-08-27 13:55','OPEN','Delivery']);
  a.run([9,'2025-08-27 18:20','OPEN','Front']);
  a.run([10,'2025-08-27 16:58','OPEN','Back Door']);

  // After fire date
  a.run([1,'2025-08-28 17:58','OPEN','Back Door']);
  a.free();

  // --- Seed: pos_sessions (ensure intersection for Finale: employees 1 and 5 appear in all three systems on 2025-08-27) ---
  const p = db.prepare(
    `INSERT INTO pos_sessions(employee_id, login_time, logout_time) VALUES(?,?,?)`
  );
  // Fire date
  p.run([1,'2025-08-27 17:45','2025-08-27 23:50']);
  p.run([2,'2025-08-27 16:50','2025-08-27 22:20']);
  p.run([5,'2025-08-27 19:45','2025-08-27 23:58']);
  // Others days
  p.run([6,'2025-08-30 18:40','2025-08-30 22:15']);
  p.run([9,'2025-08-31 17:50','2025-08-31 22:40']);
  p.free();

  // --- Seed: insurance_claims / drafts / police_reports ---
  const c = db.prepare(
    `INSERT INTO insurance_claims(business, claim_id, created_at, submitted_at, amount, prepared_by)
     VALUES(?,?,?,?,?,?)`
  );
  c.run(['Night Harbor', 'CLM-1001', '2025-08-20', '2025-08-21', 25000.00, 'Alex Vega']); // staff
  c.run(['Night Harbor', 'CLM-1002', '2025-08-28', '2025-08-29', 41000.00, 'Kim Doyle']); // NOT staff
  c.run(['Night Harbor', 'CLM-1003', '2025-08-29', '2025-08-30', 18000.00, 'Riley Chen']); // staff
  c.free();

  const d = db.prepare(
    `INSERT INTO insurance_drafts(business, claim_id, version, created_at, prepared_by)
     VALUES(?,?,?,?,?)`
  );
  d.run(['Night Harbor','CLM-1001',1,'2025-08-20','Alex Vega']);
  d.run(['Night Harbor','CLM-1002',1,'2025-08-28','Kim Doyle']);
  d.run(['Night Harbor','CLM-1002',2,'2025-08-29','Kim Doyle']);
  d.free();

  const pr = db.prepare(
    `INSERT INTO police_reports(suspect, date, arrest_time, location) VALUES(?,?,?,?)`
  );
  pr.run(['Unknown','2025-08-27',null,'Dockside']);
  pr.run(['Local','2025-08-30','23:10','Main St']);
  pr.free();

  return db;
}
