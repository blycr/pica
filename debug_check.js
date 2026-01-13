
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const db = new Database('data/pica.db');
const rows = db.prepare("SELECT title, cover_path FROM manga WHERE title LIKE '%C104%'").all();

rows.forEach(row => {
    console.log(`Title: ${row.title}`);
    console.log(`Path: ${row.cover_path}`);
    try {
        const exists = fs.existsSync(row.cover_path);
        console.log(`Exists: ${exists}`);
    } catch (e) {
        console.log(`Error checking existence: ${e.message}`);
    }
});
