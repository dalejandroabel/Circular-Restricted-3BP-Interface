  const express = require("express");
  var mysql = require('mysql2');
  const cors = require("cors");
  const spawn = require("child_process").spawn;



  require('dotenv').config()

  const corsOptions = {
    origin: "http://localhost:5173",
  };

  const app = express();
  app.use(cors(corsOptions));
  app.use(express.json());


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

  app.get("/api/families/", (req, res) => {
    let query = `SELECT * FROM families`;
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
    const LIMIT = req.query.LIMIT;
    const database = req.query.D;
    let query = `SELECT * FROM orbits WHERE id_body = ${body} AND id_family = ${family}`;
    if (p != "0" && q != "0") {
      query += ` AND resonance = '${p}:${q}'`;
    }

    if (libration != "-1") {
      query += ` AND libration = '${libration}'`;
    }
    if (batch != "-1") {
      query += ` AND batch = '${batch}'`;
    }
    if (database != "0") {
      query += ` AND source = '${database}'`;
    }
    if (LIMIT != "0") {
      query += ` LIMIT ${LIMIT}`;
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

  app.get("/api/initialconditions/:body", (req, res) => {
    const body = req.params.body;
    let query = `SELECT * FROM bodies WHERE id_body = ${body}`;
    con.query(query, function (err, result, fields) {
      if (err) throw err;
      sourcedb = result[0].sourcedb;
      if (sourcedb == "1") {
        query = `SELECT * FROM orbits WHERE id_body = ${body} AND source = 1`;
      }
      if (sourcedb == "2") {
        query = `SELECT * FROM orbits WHERE id_body = ${body} AND source = 2`;
      }
      if (sourcedb == "12") {
        query = `SELECT * FROM orbits WHERE id_body = ${body}`;
      }
      con.query(query, function (err, result, fields) {
        if (err) throw err;
        res.json({ initialconditions: result });
      }
      );
    }
    );
  }
  );

  app.post("/api/orbits/propagate/", (req, res) => {
    const x = req.body.x;
    const y = req.body.y;
    const z = req.body.z;
    const vx = req.body.vx;
    const vy = req.body.vy;
    const vz = req.body.vz;
    const mu = req.body.mu;
    const period = req.body.period;
    const method = req.body.method;
    const atol = req.body.atol;
    const rtol = req.body.rtol;
    const N = req.body.N;
    const centered = req.body.centered;

    const pythonProcess = spawn("../.crtbpenv/bin/python3", ["python_scripts/physics.py", "Propagate",
      x, y, z, vx, vy, vz, mu, period, method, atol, rtol, N, centered]);
    let dataToSend = "";

    pythonProcess.stdout.on("data", (data) => {
      dataToSend += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });


    pythonProcess.on("close", (code) => {
      res.json({ data: dataToSend });
    });
  });

  app.post("/api/orbits/correct/", (req, res) => {
    const x = req.body.x;
    const y = req.body.y;
    const z = req.body.z;
    const vx = req.body.vx;
    const vy = req.body.vy;
    const vz = req.body.vz;
    const mu = req.body.mu;
    const period = req.body.period;
    const centered = req.body.centered;

    const pythonProcess = spawn("../.crtbpenv/bin/python3", ["python_scripts/physics.py", "Correct",
      x, y, z, vx, vy, vz, mu, period, centered]);
    let dataToSend = "";
    pythonProcess.stdout.on("data", (data) => {
      dataToSend += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });


    pythonProcess.on("close", (code) => {
      res.json({ data: dataToSend });
    });

  })

  app.get("/api/orbits/lagrange/:body", (req, res) => {
    const body = req.params.body;

    let query = `SELECT * FROM bodies WHERE id_body = ${body}`;
    con.query(query, function (err, result, fields) {
      if (err) throw err;
      mu = result[0].mu;
      const pythonProcess = spawn("../.crtbpenv/bin/python3", ["python_scripts/physics.py", "Lagrange",
        mu]);
      let dataToSend = "";
      pythonProcess.stdout.on("data", (data) => {
        dataToSend += data.toString();
      });
      pythonProcess.stderr.on("data", (data) => {
        console.error(`stderr: ${data}`);
      });
      pythonProcess.on("close", (code) => {
        res.json({ data: dataToSend });
      });
      }
      );
    }
    );

  app.post("/api/orbits/sphere/", (req, res) => {
    const R = req.body.R;
    const N = req.body.N;
    const mu = req.body.mu;
    const pythonProcess = spawn("../.crtbpenv/bin/python3", ["python_scripts/physics.py", "Sphere",
      R,N,mu]);
    let dataToSend = "";
    pythonProcess.stdout.on("data", (data) => {
      dataToSend += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
    });


    pythonProcess.on("close", (code) => {
      res.json({ data: dataToSend });
    });
  }
  );



  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto: ${PORT}`);
  });



