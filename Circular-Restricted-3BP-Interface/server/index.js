const express = require("express");
var mysql = require('mysql2');
const cors = require("cors");
const { get } = require("http");
const spawn = require("child_process").spawn;


require('dotenv').config()

const corsOptions = {
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"]
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());


const PORT = process.env.PORT || 3001;


cpoi_db = mysql.createConnection({
  host: "localhost",
  user: process.env.USERDB,
  password: process.env.PASSWORDDB,
  database: process.env.MANAGERDB,
});

cpoi_db.connect(function (err) {
  if (err) throw err;
  console.log("Connected to " + process.env.MANAGERDB + " database!");
});

let cachedData = {
  databases: [],
  bodies: [],
  bodies_db: [],
  connections: [],
  columns: []
};

function getUniqueByKey(arr, key) {
  const seen = new Set();
  return arr.filter(item => {
    const keyValue = item[key];
    if (!seen.has(keyValue)) {
      seen.add(keyValue);
      return true;
    }
    return false;
  });
}


async function loadDatabases(forceRefresh = false) {
  if (!forceRefresh && cachedData.databases.length > 0) {
    return cachedData;
  }

  try {
    const [catalogs] = await cpoi_db.promise().query("SELECT name FROM catalogs");
    const databases = catalogs.map(row => row.name);

    let allBodies = [];
    let bodiesByDb = [];
    let connections = [];
    let columns = [];

    const bodyPromises = databases.map(async (db_name) => {
      try {
        const connection = await mysql.createConnection({
          host: "localhost",
          user: process.env.USERDB,
          password: process.env.PASSWORDDB,
          database: db_name,
        });
        connections.push(connection);
        const [bodies_result] = await connection.promise().query("SELECT * FROM bodies");

        bodiesByDb.push({ db: db_name, bodies: bodies_result });        return bodies_result;
      } catch (err) {
        console.error(`Error querying database ${db_name}:`, err.message);
        return [];
      }
    });

    const [columns_result] = await cpoi_db.promise().query("SELECT * FROM columns");

    const results = await Promise.all(bodyPromises);

    allBodies = results.flat();
    const uniqueBodies = getUniqueByKey(allBodies, 'id_body');

    // Update cache
    cachedData = {
      databases,
      bodies: uniqueBodies,
      bodies_db: bodiesByDb,
      connections,
      columns: columns_result
    };

    return cachedData;
  } catch (err) {
    console.error("Error loading databases:", err);
    throw err;
  }
}

async function findFamiliesIndices(familyId, body_id) {
  let indices = [];
  try {
    for (let i = 0; i < cachedData.databases.length; i++) {
      let body_check = cachedData.bodies_db[i].bodies.find(body => body.id_body == body_id);
      if (body_check) {
        const query = "SELECT id_catalog" + (i + 1) + " FROM families WHERE id_family = " + familyId + " AND id_catalog" + (i + 1) + " IS NOT NULL";
        const promise = cpoi_db.promise().query(query)
          .then(([result]) => {
            return result.length > 0 ? result[0]['id_catalog' + (i + 1)] : null;
          })
          .catch(err => {
            console.error(`Error querying catalog ${i + 1}:`, err);
            return null;
          });
        indices.push(promise);
      }
      else {
        // This database doesn't have this body
        indices.push(Promise.resolve(null));
      }
    }
    return await Promise.all(indices);
  }
  catch (err) {
    console.error(err);
    throw err;
  }
}

async function getOrbitsByFamily(families_id, id_body) {
  try {
    const orbits_promises = [];

    for (let i = 0; i < families_id.length; i++) {
      // Check if the family_id is not null (skip databases without this body/family)
      if (families_id[i] !== null) {
        const query = `SELECT * FROM orbits WHERE id_body = ${id_body} AND id_family = ${families_id[i]}`;

        // Push to orbits_promises, not orbits.promises
        orbits_promises.push(
          cachedData.connections[i].promise().query(query)
            .then(([result]) => {
              return result.map(item => ({ ...item, source: cachedData.databases[i] }));
            })
            .catch(err => {
              console.error(`Error querying database ${i}:`, err);
              return []; // Return empty array on error to prevent Promise.all from failing
            })
        );
      }
    }

    const results = await Promise.all(orbits_promises);
    return results.flat();
  }
  catch (err) {
    console.error(err);
    throw err;
  }
}

async function getAllOrbitsFromBody(id_body) {
  try {
    const orbits_promises = [];

    for (let i = 0; i < cachedData.databases.length; i++) {
      const query = `SELECT * FROM orbits WHERE id_body = ${id_body}`;

      orbits_promises.push(
        cachedData.connections[i].promise().query(query)
          .then(([result]) => {
            return result.map(item => ({ ...item, source: cachedData.databases[i] }));
          })
          .catch(err => {
            console.error(`Error querying database ${i}:`, err);
            return []; // Return empty array on error to prevent Promise.all from failing
          })
      );
    }

    const results = await Promise.all(orbits_promises);
    return results.flat();
  }
  catch (err) {
    console.error(err);
    throw err;
  }
};

async function getBodyById(id_body) {
  try {
    for (let i = 0; i < cachedData.databases.length; i++) {
      let body = cachedData.bodies_db[i].bodies.find(body => body.id_body == id_body);
      if (body) {
        return body;
      }
    }
  }
  catch (err) {
    console.error(err);
    throw err;
  }
};

async function getColumnsByBody(id_body) {
  try {
    const databases_in = [];
    for (let i = 0; i < cachedData.databases.length; i++) {
      let body = cachedData.bodies_db[i].bodies.find(body => body.id_body == id_body);
      if (body) {
        databases_in.push(cachedData.databases[i]);
      }
    }
    if (databases_in.length === 0) {
      return [];
    }
    const whereConditions = databases_in.map(db => `${db} IS NOT NULL`).join(' AND ');
    const query = `SELECT * FROM columns WHERE ${whereConditions}`;

    const [result] = await cpoi_db.promise().query(query);
    return result;
  }
  catch (err) {
    console.error(err);
    throw err;
  }
}

app.get("/api/databases/", async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await loadDatabases(forceRefresh);
    res.json({
      databases: data.databases,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load databases", message: err.message });
  }
});


app.get("/api/primaries", async (req, res) => {
  try {
    const cachedData = await loadDatabases();
    const primaryIds = cachedData.bodies.map(body => body.primary_id).filter(id => id != null);
    const primaries = cachedData.bodies.filter(body => primaryIds.includes(body.id_body));

    res.json({ primaries });
  } catch (err) {
    res.status(500).json({ error: "Failed to get primaries", message: err.message });
  }
});

app.get("/api/Allbodies/", async (req, res) => {
  try {
    const Bodies = (await loadDatabases()).bodies;
    res.json({ bodies: Bodies });
  } catch (err) {
    res.status(500).json({ error: "Failed to load bodies", message: err.message });
  }
});

app.get("/api/secondaries/:id", (req, res) => {
  const id = req.params.id;
  let secondaries = cachedData.bodies.filter(body => body.primary_id == id);

  res.json({ secondaries });
}
);


app.get("/api/families/:id", async (req, res) => {
  try {
    let promises = [];
    for (let i = 0; i < cachedData.databases.length; i++) {
      if (cachedData.bodies_db[i].bodies.find(body => body.id_body == req.params.id)) {
        const query =
          'SELECT * FROM families WHERE id_catalog' + (i + 1) + ' IS NOT NULL';
        promises.push(
          new Promise((resolve, reject) => {
            cpoi_db.promise().query(query)
              .then(([result]) => { resolve(result) })
              .catch(err => reject(err));
          })
        );
      }
    }

    const results = await Promise.all(promises);

    let families = results.flat();
    families = Array.from(
      new Map(families.map(f => [f.id_family, f])).values()
    );
    res.json({ families });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/Allfamilies/", async (req, res) => {
  try {
    const query = 'SELECT * FROM families'
    const response = await cpoi_db.promise().query(query);
    res.json({ families: response[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/allfamilies/:db", async (req, res) => {
  const db_name = req.params.db;
  const index = cachedData.databases.indexOf(db_name);
  if (index === -1) {
    return res.status(404).json({ error: "Database not found" });
  }
  let query = 'SELECT * FROM families';
  cachedData.connections[index].query(query, async function (err, result) {
    if (err) throw err;
    ipoc_names = [];
    for (let i = 0; i < result.length; i++) {
      ipoc_names.push(new Promise((resolve, reject) => {
        let query2 = `SELECT name FROM families WHERE id_catalog${index + 1} = ${result[i].id_family}`;
        cpoi_db.query(query2, function (err, result2) {
          if (err) reject(err);
          resolve(result2[0].name);
        });
      }));
    }
    const names = await Promise.all(ipoc_names);
    for (let i = 0; i < result.length; i++) {
      result[i].name = names[i];
    }
    res.json({ families: result });
  });
});

app.get("/api/allColumns/", async (req, res) => {
  try {
    const query = 'SELECT * FROM columns'
    const response = await cpoi_db.promise().query(query);
    res.json({ columns: response[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/orbits/", async (req, res) => {
  try {
    const body = req.query.S;
    const family = req.query.F;
    const LIMIT = req.query.LIMIT;
    const families_id = await findFamiliesIndices(family, body);

    const orbits = await getOrbitsByFamily(families_id, body);
    let finalOrbits = orbits;
    if (LIMIT && LIMIT !== "0") {
      finalOrbits = orbits.slice(0, parseInt(LIMIT));
    }
    const columns = await getColumnsByBody(body);
    const columnMapping = {};

    columns.forEach(col => {
      for (const db of cachedData.databases) {
        if (col[db]) {
          columnMapping[col[db]] = col.c_name;
        }
      }
    });


    finalOrbits = finalOrbits.map(orbit => {
      const renamedOrbit = {};
      for (const [key, value] of Object.entries(orbit)) {
        const newKey = columnMapping[key] || key;
        renamedOrbit[newKey] = value;
      }
      return renamedOrbit;
    });
    res.json({
      orbits: finalOrbits,
      body: body,
      total: finalOrbits.length
    });
  } catch (err) {
    console.error('Error in /api/orbits:', err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/columns/:body", async (req, res) => {
  try {
    const body = req.params.body;
    const columns = await getColumnsByBody(body);
    res.json(columns);
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/bodies/:body", async (req, res) => {

  try {
    body = await getBodyById(req.params.body);
    res.json({ body: body });
  }
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


app.get("/api/initialconditions/:body", async (req, res) => {
  const body = req.params.body;
  try {
    let orbits = [];
    for (let i = 0; i < cachedData.databases.length; i++) {
      let body_check = cachedData.bodies_db[i].bodies.find(b => b.id_body == body);
      if (body_check) {
        bodyOrbits = await getAllOrbitsFromBody(body);
        orbits = orbits.concat(bodyOrbits);
      }
    }
    res.json({ initialconditions: orbits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

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

  const pythonProcess = spawn(".crtbp_venv/bin/python3", ["python_scripts/physics.py", "Propagate",
    x, y, z, vx, vy, vz, mu, period, method, atol, rtol, N]);
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

  const pythonProcess = spawn(".crtbp_venv/bin/python3", ["python_scripts/physics.py", "Correct",
    x, y, z, vx, vy, vz, mu, period]);
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

app.get("/api/bodies/radiusR1/:id_body", async (req, res) => {
  const id_body = req.params.id_body;
  const body = await getBodyById(id_body);
  const primary_id = body.primary_id;
  const P_body = await getBodyById(primary_id);
  const R1 = P_body.radius_ul * (P_body.distance_km / body.distance_km);
  res.json({ radius_r1: R1 });  
  });

app.get("/api/orbits/lagrange/:id_body", async (req, res) => {
  const id_body = req.params.id_body;
  body = await getBodyById(id_body);
  mu = body.mu;

  const pythonProcess = spawn(".crtbp_venv/bin/python3", ["python_scripts/physics.py", "Lagrange",
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


app.post("/api/orbits/sphere/", (req, res) => {
  const R = req.body.R;
  const N = req.body.N;
  const mu = req.body.mu;
  const pythonProcess = spawn(".crtbp_venv/bin/python3", ["python_scripts/physics.py", "Sphere",
    R, N, mu]);
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



