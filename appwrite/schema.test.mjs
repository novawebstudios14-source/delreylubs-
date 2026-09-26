import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('preserva proprietário, lembretes e quilometragem pelo schema PostgreSQL', async () => {
  const database = new PGlite();
  try {
    await database.exec(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
    const customer=(await database.query("insert into customers(name,phone) values('Cliente','5511999999999') returning id")).rows[0].id;
    const vehicle=(await database.query("insert into vehicles(customer_id,plate,brand,model,year) values($1,'ABC1D23','Marca','Modelo',2020) returning id,public_id",[customer])).rows[0];
    assert.equal((await database.query('select count(*)::int as count from vehicle_ownership_history')).rows[0].count,1);
    const service=(await database.query("insert into services(vehicle_id,service_date,mileage,type,description,next_due_mileage) values($1,'2026-09-26',12500,'Revisão','Óleo',17500) returning id",[vehicle.id])).rows[0];
    assert.equal((await database.query('select mileage from vehicles where id=$1',[vehicle.id])).rows[0].mileage,12500);
    assert.equal((await database.query('select due_mileage from maintenance_reminders where service_id=$1',[service.id])).rows[0].due_mileage,17500);
    await database.query('update services set next_due_mileage=$1 where id=$2',[18000,service.id]);
    assert.equal((await database.query('select due_mileage from maintenance_reminders where service_id=$1',[service.id])).rows[0].due_mileage,18000);
    assert.equal((await database.query('select public_id from vehicles where id=$1',[vehicle.id])).rows[0].public_id,vehicle.public_id);
  } finally {await database.close();}
});
