import {getConnectionString} from '@netlify/database';
import pg from 'pg';
import {service} from '../../lib/service.mjs';
let pool;
const repository={
 async create(code,room){const {rowCount}=await getPool().query('INSERT INTO hangman_rooms (code,state,expires_at) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',[code,JSON.stringify(room),new Date(room.expiresAt)]);return rowCount===1;},
 async transaction(code,fn){const client=await getPool().connect();try{await client.query('BEGIN');const {rows}=await client.query('SELECT state FROM hangman_rooms WHERE code=$1 FOR UPDATE',[code]);const state=rows[0]?.state||null,version=state?.version;const result=await fn(state);if(state&&state.version!==version)await client.query('UPDATE hangman_rooms SET state=$2,expires_at=$3 WHERE code=$1',[code,JSON.stringify(state),new Date(state.expiresAt)]);await client.query('COMMIT');return result;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
};
function getPool(){return pool??=new pg.Pool({connectionString:getConnectionString(),max:2,connectionTimeoutMillis:10000,idleTimeoutMillis:10000});}
export default service(repository,{allowTest:process.env.HANGMAN_ALLOW_TEST_CREDITS==='true'});
