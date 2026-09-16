import pg from 'pg';
import 'dotenv/config';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkUser() {
  try {
    const res = await pool.query('SELECT * FROM public."user" WHERE email = $1', ['admin@aquaflow.com']);
    if (res.rows.length === 0) {
      console.log('User not found in database.');
    } else {
      const user = res.rows[0];
      console.log('User found:', { id: user.id, email: user.email, role: user.role, hash: user.passwordHash });
      const isValid = await bcrypt.compare('Admin@123', user.passwordHash);
      console.log('Password isValid:', isValid);
    }
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
checkUser();
