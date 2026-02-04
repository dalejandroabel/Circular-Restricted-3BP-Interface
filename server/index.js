const express = require("express");
const { get } = require("http");
const spawn = require("child_process").spawn;


require('dotenv').config()


const { managerPool, getCatalogPool } = require("./db")

const app = express();
app.use(express.json());


const PORT = process.env.PORT || 3001;


let cachedData = {
  databases: [],
  bodies: [],
  bodies_db: [],
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
    const [catalogs] = await managerPool.query("SELECT name FROM catalogs");
    const databases = catalogs.map(r => r.name);

    let allBodies = [];
    let bodiesByDb = [];

    for (const db_name of databases) {
      try {
        const pool = getCatalogPool(db_name);
        const [bodies] = await pool.query("SELECT * FROM bodies");

        bodiesByDb.push({ db: db_name, bodies });
        allBodies.push(...bodies);
      } catch (err) {
        console.error(`Error DB ${db_name}:`, err.message);
      }
    }

    const [columns] = await managerPool.query("SELECT * FROM columns");

    cachedData = {
      databases,
      bodies: getUniqueByKey(allBodies, "id_body"),
      bodies_db: bodiesByDb,
      columns
    };

    return cachedData;
  } catch (err) {
    console.error("Error loading databases:", err);
    throw err;
  }
}

async function findFamiliesIndices(familyId, body_id) {
  const indices = [];

  for (let i = 0; i < cachedData.databases.length; i++) {
    const hasBody = cachedData.bodies_db[i].bodies
      .some(b => b.id_body == body_id);

    if (!hasBody) {
      indices.push(null);
      continue;
    }

    const query = `
      SELECT id_catalog${i + 1} AS id 
      FROM families 
      WHERE id_family = ? AND id_catalog${i + 1} IS NOT NULL
    `;

    const [rows] = await managerPool.query(query, [familyId]);
    indices.push(rows.length ? rows[0].id : null);
  }

  return indices;
}


async function getOrbitsByFamily(families_id, id_body) {
  const orbits_promises = [];

  for (let i = 0; i < families_id.length; i++) {
    if (families_id[i] !== null) {
      const db = cachedData.databases[i];
      const pool = getCatalogPool(db);

      const query = `
        SELECT * FROM orbits 
        WHERE id_body = ? AND id_family = ?
      `;

      orbits_promises.push(
        pool.query(query, [id_body, families_id[i]])
          .then(([result]) =>
            result.map(o => ({ ...o, source: db }))
          )
          .catch(err => {
            console.error(`DB ${db}:`, err.message);
            return [];
          })
      );
    }
  }

  const results = await Promise.all(orbits_promises);
  return results.flat();
}


async function getAllOrbitsFromBody(id_body) {
  const orbits_promises = [];

  for (const db of cachedData.databases) {
    const pool = getCatalogPool(db);
    const query = "SELECT * FROM orbits WHERE id_body = ?";

    orbits_promises.push(
      pool.query(query, [id_body])
        .then(([rows]) =>
          rows.map(o => ({ ...o, source: db }))
        )
        .catch(() => [])
    );
  }

  const results = await Promise.all(orbits_promises);
  return results.flat();
}


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

    const [result] = await managerPool.query(query)
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
            managerPool.query(query)
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
    const [response] = await managerPool.query(query);
    res.json({ families: response });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/api/allfamilies/:db", async (req, res) => {
  try {
    const db_name = req.params.db;
    const index = cachedData.databases.indexOf(db_name);

    if (index === -1) {
      return res.status(404).json({ error: "Database not found" });
    }

    const pool = getCatalogPool(db_name);

    const [families] = await pool.query("SELECT * FROM families");

    const namePromises = families.map(fam => {
      const q = `
        SELECT name 
        FROM families 
        WHERE id_catalog${index + 1} = ?
      `;
      return managerPool
        .query(q, [fam.id_family])
        .then(([rows]) => rows[0]?.name ?? null);
    });

    const names = await Promise.all(namePromises);

    families.forEach((fam, i) => {
      fam.name = names[i];
    });

    res.json({ families });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});


app.get("/api/allColumns/", async (req, res) => {
  try {
    const query = 'SELECT * FROM columns'
    const [response] = await managerPool.query(query);
    res.json({ columns: response });
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
  try {
    const id_body = req.params.id_body;
    const body = await getBodyById(id_body);
    
    if (!body) {
      return res.status(404).json({ error: "Body not found", id_body });
    }
    
    console.log(body, id_body);
    const mu = body.mu;

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
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error", message: err.message });
  }
});


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

loadDatabases()
  .then(() => {
    console.log('Cache initialized successfully');
    app.listen(PORT, () => {
      console.log(`Servidor escuchando en el puerto: ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize cache:', err);
    process.exit(1);
  });
