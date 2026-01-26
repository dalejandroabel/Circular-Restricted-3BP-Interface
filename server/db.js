const mysql = require("mysql2/promise");
require("dotenv").config();

const managerPool = mysql.createPool({
  host: "localhost",
  user: process.env.USERDB,
  password: process.env.PASSWORDDB,
  database: process.env.MANAGERDB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const catalogPools = new Map();

function getCatalogPool(dbName) {
  if (!catalogPools.has(dbName)) {
    catalogPools.set(
      dbName,
      mysql.createPool({
        host: "localhost",
        user: process.env.USERDB,
        password: process.env.PASSWORDDB,
        database: dbName,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0
      })
    );
  }
  return catalogPools.get(dbName);
}

module.exports = { managerPool, getCatalogPool };
