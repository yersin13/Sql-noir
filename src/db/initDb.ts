import initSqlJs, { Database } from 'sql.js';

/**
 * Initialize an in-memory sql.js Database and seed all tables deterministically.
 * Called once on app load.
 */
export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs({
    // sql.js will fetch this WASM from the official CDN
    locateFile: (file: string) => `https://sql.js.org/dist/${file}`
  });
  const db = new SQL.Database();

  // --- Schema ---
  db.run(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE shift_logs (
      employee_id   INT,
      employee_name TEXT,
      role          TEXT,
      date          TEXT,   -- YYYY-MM-DD
      clock_in      TEXT,   -- HH:MM
      clock_out     TEXT    -- HH:MM or NULL
    );

    CREATE TABLE access_logs (
      employee_id INT,
      event_time  TEXT,   -- ISO 8601
      action      TEXT,   -- ENTER / EXIT
      door        TEXT
    );

    CREATE TABLE pos_sessions (
      employee_id INT,
      login_time  TEXT,
      logout_time TEXT
    );

    CREATE TABLE insurance_claims (
      business     TEXT,
      claim_id     TEXT,
      created_at   TEXT,
      submitted_at TEXT,
      amount       REAL,
      prepared_by  TEXT
    );

    CREATE TABLE insurance_drafts (
      business    TEXT,
      claim_id    TEXT,
      version     INT,
      created_at  TEXT,
      prepared_by TEXT
    );

    CREATE TABLE police_reports (
      suspect    TEXT,
      date       TEXT,
      arrest_time TEXT,
      location   TEXT
    );
  `);

  // --- Seed shift_logs (Aug 1–30, 2025). Include fire date: 2025-08-27 with a couple NULL clock_outs. ---
  type Row = [number, string, string, string, string, string | null];

  const E = [
    [1, 'Ava Chen', 'Manager'],
    [2, 'Marco Ruiz', 'Cook'],
    [3, 'Nadia Petrov', 'Cashier'],
    [4, 'Samir Patel', 'Security'],
    [5, 'Luc Tremblay', 'Server'],
    [6, 'Maya Gagnon', 'Server'],
    [7, 'Jonas Miller', 'Cook'],
    [8, 'Élodie Marchand', 'Cashier']
  ] as const;

  const rows: Row[] = [];

  // Helper to push one
  function add(empIdx: number, date: string, inT: string, outT: string | null) {
    const [id, name, role] = E[empIdx];
    rows.push([id, name, role, date, inT, outT]);
  }

  // A handful of scheduled shifts across the month—mix of closers and earlier shifts
  // We'll craft deterministic data with late nights sprinkled.
  const days = [
    '2025-08-01','2025-08-02','2025-08-03','2025-08-05','2025-08-06','2025-08-07',
    '2025-08-09','2025-08-10','2025-08-12','2025-08-13','2025-08-15','2025-08-17',
    '2025-08-19','2025-08-20','2025-08-22','2025-08-24','2025-08-25','2025-08-26',
    '2025-08-27','2025-08-28','2025-08-29','2025-08-30'
  ];

  // Non-fire days
  add(0, '2025-08-01', '16:00', '23:15'); // Ava
  add(1, '2025-08-01', '15:00', '22:10'); // Marco
  add(2, '2025-08-02', '18:00', '23:45'); // Nadia late
  add(3, '2025-08-03', '20:00', '00:15'); // Samir close
  add(4, '2025-08-05', '17:30', '22:50'); // Luc
  add(5, '2025-08-06', '19:30', '23:05'); // Maya late
  add(6, '2025-08-07', '14:00', '21:00'); // Jonas
  add(7, '2025-08-09', '18:00', '23:20'); // Élodie late
  add(2, '2025-08-10', '16:00', '20:45'); // Nadia earlier
  add(1, '2025-08-12', '19:00', '23:55'); // Marco late-late
  add(3, '2025-08-13', '20:30', '23:58'); // Samir
  add(4, '2025-08-15', '12:00', '19:00'); // Luc
  add(5, '2025-08-17', '21:00', '23:59'); // Maya close
  add(6, '2025-08-19', '18:15', '23:10'); // Jonas
  add(7, '2025-08-20', '16:45', '22:30'); // Élodie
  add(0, '2025-08-22', '17:00', '23:40'); // Ava late
  add(1, '2025-08-24', '20:00', '23:50'); // Marco
  add(2, '2025-08-25', '19:00', '22:15'); // Nadia
  add(3, '2025-08-26', '20:15', '23:30'); // Samir

  // FIRE NIGHT 2025-08-27—varied shifts; two missing clock_out
  add(0, '2025-08-27', '18:00', '23:20'); // Ava
  add(1, '2025-08-27', '19:00', null);    // Marco (missing)
  add(2, '2025-08-27', '21:15', '23:59'); // Nadia late
  add(3, '2025-08-27', '20:45', '00:35'); // Samir latest out
  add(4, '2025-08-27', '17:30', '22:10'); // Luc
  add(5, '2025-08-27', '22:00', null);    // Maya (missing)
  add(6, '2025-08-27', '16:30', '21:45'); // Jonas
  add(7, '2025-08-27', '19:30', '23:10'); // Élodie

  // A couple after the fire, to build baseline/variance
  add(0, '2025-08-28', '18:10', '23:00');
  add(3, '2025-08-29', '20:00', '23:50');
  add(5, '2025-08-30', '21:00', '23:40');

  const insert = db.prepare(`
    INSERT INTO shift_logs (employee_id, employee_name, role, date, clock_in, clock_out)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  db.run('BEGIN TRANSACTION');
  for (const r of rows) insert.run(r as any);
  db.run('COMMIT');
  insert.free();

  // --- Seed access_logs (scaffold) ---
  db.run(`
    INSERT INTO access_logs VALUES
      (1,'2025-08-27T17:52:00','ENTER','BACK_DOOR'),
      (3,'2025-08-27T21:12:00','ENTER','FRONT'),
      (3,'2025-08-27T23:59:40','EXIT','FRONT'),
      (4,'2025-08-28T00:38:00','EXIT','STAFF'),
      (5,'2025-08-27T22:05:00','ENTER','STAFF');
  `);

  // --- Seed pos_sessions (scaffold) ---
  db.run(`
    INSERT INTO pos_sessions VALUES
      (3,'2025-08-27T21:17:00','2025-08-27T23:58:30'),
      (7,'2025-08-27T19:32:10','2025-08-27T23:12:00'),
      (1,'2025-08-27T18:05:00','2025-08-27T23:18:00');
  `);

  // --- Seed insurance tables (scaffold) ---
  db.run(`
    INSERT INTO insurance_claims VALUES
      ('North Pier','CLM-1001','2025-08-10','2025-08-12', 18000.00,'Ava Chen'),
      ('North Pier','CLM-1002','2025-08-28',NULL, 7500.00,'Marco Ruiz');
    INSERT INTO insurance_drafts VALUES
      ('North Pier','CLM-1002',1,'2025-08-27','Marco Ruiz'),
      ('North Pier','CLM-1002',2,'2025-08-28','Ava Chen');
  `);

  // --- Seed police_reports (scaffold) ---
  db.run(`
    INSERT INTO police_reports VALUES
      ('Unknown','2025-08-27','00:50','North Pier'),
      ('Unknown','2025-08-20',NULL,'Side Alley');
  `);

  return db;
}
