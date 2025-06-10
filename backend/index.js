const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const path = require('path'); // ✅ Para rutas absolutas

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 📦 Conexión a MySQL
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

connection.connect(err => {
  if (err) {
    console.error('❌ Error conectando a MySQL:', err);
    return;
  }
  console.log('✅ Conectado a MySQL');
});

app.use(express.json());

// ✅ RUTA CORRECTA al frontend montado en /app/frontend
const frontendPath = path.join(__dirname, 'frontend');

app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 🔍 Buscar cita
app.get('/citas', (req, res) => {
  const { dni, fecha_nacimiento } = req.query;

  if (!dni || !fecha_nacimiento) {
    return res.status(400).json({ error: 'dni y fecha_nacimiento son requeridos' });
  }

  const query = `SELECT * FROM citas WHERE dni = ? AND fecha_nacimiento = ?`;
  connection.query(query, [dni, fecha_nacimiento], (err, results) => {
    if (err) {
      console.error('❌ Error en consulta:', err);
      return res.status(500).json({ error: 'Error en la base de datos' });
    }

    if (results.length === 0) {
      return res.status(404).json({ mensaje: '❌ No se encontró ninguna cita con esos datos' });
    }

    res.json(results);
  });
});

// ➕ Crear cita
app.post('/crear-cita', (req, res) => {
  const {
    dni,
    fecha_nacimiento,
    fecha_cita,
    consultorio,
    prescriptor,
    turno,
    numero_cupo
  } = req.body;

  if (!dni || !fecha_nacimiento || !fecha_cita) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  const query = `
    INSERT INTO citas 
    (dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor, turno, numero_cupo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    query,
    [dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor, turno, numero_cupo],
    (err, result) => {
      if (err) {
        console.error('❌ Error al insertar cita:', err);
        return res.status(500).json({ error: 'Error al insertar cita en la base de datos' });
      }

      res.status(201).json({ mensaje: '✅ Cita creada correctamente', id: result.insertId });
    }
  );
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});
