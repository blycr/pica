
import Database from 'better-sqlite3';

async function test() {
    const db = new Database('data/pica.db');
    const row = db.prepare("SELECT title, cover_path FROM manga WHERE title LIKE '%C104%'").get();

    if (!row) {
        console.log('Manga not found');
        return;
    }

    const encodedPath = encodeURIComponent(row.cover_path);
    const url = `http://localhost:3000/api/thumbnails/generate?path=${encodedPath}&size=medium`;

    console.log(`Testing URL: ${url}`);

    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);

        if (!res.ok) {
            const text = await res.text();
            console.log(`Error body: ${text}`);
        } else {
            const buffer = await res.arrayBuffer();
            console.log(`Success! Received ${buffer.byteLength} bytes`);
        }
    } catch (e) {
        console.log(`Fetch failed: ${e.message}`);
    }
}

test();
