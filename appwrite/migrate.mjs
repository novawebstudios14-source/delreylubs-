// Run from a trusted machine. The source database is never modified.
// Requires SOURCE_DATABASE_URL, APPWRITE_DATABASE_URL, APPWRITE_ENDPOINT,
// APPWRITE_PROJECT_ID and APPWRITE_API_KEY (users.write). Do not log secrets.
import { Pool } from 'pg';
import { Client, Users } from 'node-appwrite';
import { createHash } from 'node:crypto';

const tables = [
  'profiles', 'customers', 'vehicles', 'vehicle_ownership_history',
  'services', 'maintenance_reminders', 'contact_logs',
];
const required = ['SOURCE_DATABASE_URL','APPWRITE_DATABASE_URL','APPWRITE_ENDPOINT','APPWRITE_PROJECT_ID','APPWRITE_API_KEY'];
for (const name of required) if (!process.env[name]) throw new Error(`${name} não configurada.`);
const apply = process.argv.includes('--apply');
const source = new Pool({connectionString:process.env.SOURCE_DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
const destination = new Pool({connectionString:process.env.APPWRITE_DATABASE_URL,ssl:{rejectUnauthorized:true},max:1});
const appwrite = new Users(new Client().setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY));

const hash = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
const select = (client,table) => client.query(`select * from ${table} order by id`);

try {
  const src = await source.connect();
  const dst = await destination.connect();
  try {
    await src.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const users = (await src.query('select id,email,encrypted_password,raw_user_meta_data from auth.users order by id')).rows;
    if (users.some(user => !user.email || !/^\$2[aby]\$/.test(user.encrypted_password ?? ''))) {
      throw new Error('Conta sem e-mail/senha bcrypt: migração automática da senha não é segura.');
    }
    const input = new Map();
    for (const table of tables) input.set(table,(await select(src,table)).rows);
    if (users.length !== input.get('profiles').length || users.some(user => !input.get('profiles').some(profile => profile.id===user.id))) {
      throw new Error('Usuários e perfis não coincidem; revisar antes de importar.');
    }
    for (const table of tables) {
      const count=(await destination.query(`select count(*)::int as count from ${table}`)).rows[0].count;
      if (count) throw new Error(`Destino não está vazio: ${table}. Não sobrescrever dados.`);
      console.log(`${table}: ${input.get(table).length} linhas; SHA-256 ${hash(input.get(table))}`);
    }
    console.log(`Contas com senha bcrypt: ${users.length}.`);
    if (!apply) { console.log('Prévia concluída. Use --apply somente depois de conferir o destino e o backup.'); process.exitCode=0; }
    else {
      await dst.query('BEGIN');
      try {
        // Preserve source IDs, timestamps, ownership and reminders exactly.
        await dst.query('ALTER TABLE vehicles DISABLE TRIGGER vehicle_initial_owner');
        await dst.query('ALTER TABLE services DISABLE TRIGGER service_reminder');
        await dst.query('ALTER TABLE services DISABLE TRIGGER service_mileage');
        for (const table of tables) {
          for (const row of input.get(table)) {
            const columns=Object.keys(row);
            const identifiers=columns.map(column => `"${column}"`).join(',');
            const placeholders=columns.map((_,index)=>`$${index+1}`).join(',');
            await dst.query(`insert into ${table}(${identifiers}) values(${placeholders})`,Object.values(row));
          }
        }
        await dst.query('ALTER TABLE vehicles ENABLE TRIGGER vehicle_initial_owner');
        await dst.query('ALTER TABLE services ENABLE TRIGGER service_reminder');
        await dst.query('ALTER TABLE services ENABLE TRIGGER service_mileage');
        for (const table of tables) {
          const output=(await select(dst,table)).rows;
          if (hash(input.get(table))!==hash(output)) throw new Error(`Divergência em ${table}. Transação será revertida.`);
          console.log(`${table}: conferido (${output.length} linhas).`);
        }
        await dst.query('COMMIT');
      } catch(error) {await dst.query('ROLLBACK');throw error;}
      // Appwrite authentication is separate from native PostgreSQL.
      // Preserve the original UUID and bcrypt hash; do not expose or print either.
      for (const user of users) {
        const name=typeof user.raw_user_meta_data?.full_name==='string' ? user.raw_user_meta_data.full_name : user.email.split('@')[0];
        await appwrite.createBcryptUser({userId:user.id,email:user.email,password:user.encrypted_password,name});
      }
      console.log(`Importação concluída: ${users.length} conta(s). Teste o login e os QR codes antes de mudar o domínio.`);
    }
    await src.query('ROLLBACK');
  } finally {src.release();dst.release();}
} finally {await source.end();await destination.end();}
