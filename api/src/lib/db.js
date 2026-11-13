const sql = require('mssql');
let poolPromise;

function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(process.env.SQL_CONNECTION_STRING).connect();
  }
  return poolPromise;
}

// Always parameterized: query('... WHERE id = @id', { id: 5 })
async function query(text, params = {}) {
  const req = (await getPool()).request();
  for (const [k, v] of Object.entries(params)) req.input(k, v);
  return (await req.query(text)).recordset;
}

module.exports = { query, sql, getPool };
