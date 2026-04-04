const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        connectionString: 'postgres://postgres:QRrZuTDdOxycjFUs@db.bddsqcullhonpzhqglxz.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        console.log("Exito!");
        await client.end();
    } catch (e) {
        console.error("Error:", e.message);
    }
}

testConnection();
