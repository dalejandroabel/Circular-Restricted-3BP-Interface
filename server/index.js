const express = require("express");
var mysql = require('mysql2');
const cors = require("cors");



require('dotenv').config()

const corsOptions = {
  origin: "http://localhost:5173",
};

const app = express();
app.use(cors(corsOptions));

const PORT = process.env.PORT || 3001;

var con = mysql.createConnection({
  host: "localhost",
  user: process.env.USERDB,
  password: process.env.PASSWORDDB,
  database: process.env.DATABASE,
});


con.connect(function (err) {
  if (err) throw err;
  console.log("Connected!");
});

let bodies;

con.query("SELECT * FROM bodies", function (err, result, fields) {
  if (err) throw err;
  bodies = result;
});

app.get("/api/primaries", (req, res) => {
  let primaryIds = bodies.map(body => body.primary_id);
  let primaries = bodies.filter(body => primaryIds.includes(body.id_body));
  res.json({ primaries });
}
);

app.get("/api/secondaries/:id", (req, res) => {
  const id = req.params.id;
  let secondaries = bodies.filter(body => body.primary_id == id);
  res.json({ secondaries });
}
);

app.get("/api/families/:id", (req, res) => {
  const id = req.params.id;
  let sourcedb = bodies.find(body => body.id_body == id).sourcedb;
  var query;
  if (sourcedb == 1) {
    query = `SELECT * FROM families WHERE sourcedb = 1 OR sourcedb = 12`;
  } else if (sourcedb == 2) {
    query = `SELECT * FROM families WHERE sourcedb = 2 OR sourcedb = 12`;
  } else if (sourcedb == 12) {
    query = `SELECT * FROM families WHERE sourcedb = 12 OR sourcedb = 1 OR sourcedb = 2`;
  }
  con.query(query, function (err, result, fields) {
    if (err) throw err;
    res.json({ families: result });
  }
  );
}
);

app.get("/api/librationbatch/:family", (req, res) => {
  const family = req.params.family;
  let query = `SELECT * FROM families WHERE id_family = ${family}`;
  con.query(query, function (err, result, fields) {
    if (err) throw err;
    res.json({ family: result });
  }
  );
})

app.get("/api/resonances/:body", (req, res) => {
  const body = req.params.body;
  let query = `SELECT * FROM resonances WHERE body = ${body}`;
  con.query(query, function (err, result, fields) {
    if (err) throw err;
    res.json({ resonances: result });
  }
  );
})

app.get("/api/orbits/", (req, res) => {
  const body = req.query.S;
  const family = req.query.F;
  const p = req.query.P;
  const q = req.query.Q;
  const libration = req.query.L;
  const batch = req.query.B;
  let query = `SELECT * FROM orbits WHERE id_body = ${body} AND id_family = ${family}`;
  if (p != "0") {
    query += ` AND p = ${p}`;
  }
  if (q != "0") {
    query += ` AND q = ${q}`;
  }
  if (libration != "-1") {
    query += ` AND libration = '${libration}'`;
  }
  if (batch != "-1") {
    query += ` AND batch = '${batch}'`;
  }
  con.query(query, function (err, result, fields) {
    if (err) throw err;
    res.json({
      orbits: result,
      body: body,
    });
  }
  );

}
);

app.get("/api/bodies/:body", (req, res) => {
  const body = req.params.body;
  let query = `SELECT * FROM bodies WHERE id_body = ${body}`;
  con.query(query, function (err, result, fields) {
    if (err) throw err;
    res.json({ body: result });
  }
  );
}
);

app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto: ${PORT}`);
});



