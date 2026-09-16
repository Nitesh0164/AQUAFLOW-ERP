const { Client } = require('pg');
require('dotenv').config();

async function checkDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE' 
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
    `);
    
    console.log("Current tables in database by schema:");
    res.rows.forEach(row => {
      console.log(`- ${row.table_schema}.${row.table_name}`);
    });
    
  } catch (err) {
    console.error('Error connecting or querying:', err.message);
  } finally {
    await client.end();
  }
}

checkDb();
