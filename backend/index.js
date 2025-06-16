const express = require('express');
const mysql = require('mysql2/promise'); // Cambiado a promesas para mejor manejo async/await
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 📦 Pool de conexiones MySQL (más eficiente que una sola conexión)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Verificar conexión inicial
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Conectado a MySQL');
    connection.release();
  } catch (err) {
    console.error('❌ Error conectando a MySQL:', err);
    process.exit(1);
  }
})();

app.use(express.json());

const frontendPath = path.join(__dirname, 'frontend');
app.use(express.static(frontendPath));

// Middleware para manejo de errores
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Middleware de validación
const validateRequired = (fields) => (req, res, next) => {
  try {
    // Verificar que fields sea un array válido
    if (!fields || !Array.isArray(fields)) {
      console.error('validateRequired: fields debe ser un array:', fields);
      return res.status(500).json({ error: 'Error de configuración del servidor' });
    }
    
    // Debug: mostrar qué campos se están validando
    console.log('Validando campos:', fields);
    console.log('req.body:', req.body);
    console.log('req.query:', req.query);
    
    // Verificar que req.body y req.query existan
    const body = req.body || {};
    const query = req.query || {};
    
    // Filtrar campos válidos (que no sean undefined o null)
    const validFields = fields.filter(field => field != null && typeof field === 'string');
    
    console.log('Campos válidos después del filtro:', validFields);
    
    const missing = validFields.filter(field => !body[field] && !query[field]);
    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Campos requeridos faltantes: ${missing.join(', ')}` 
      });
    }
    next();
  } catch (error) {
    console.error('Error en validateRequired:', error);
    console.error('Fields recibido:', fields);
    console.error('req.body:', req.body);
    console.error('req.query:', req.query);
    return res.status(500).json({ error: 'Error interno en validación' });
  }
};

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.get('/disponibles', (req, res) => {
  res.sendFile(path.join(frontendPath, 'citas-disponibles.html'));
});

app.get('/registrar', (req, res) => {
  res.sendFile(path.join(frontendPath, 'registrar-cita.html'));
});

// 🔍 Buscar cita individual
app.get('/citas', validateRequired(['dni', 'fecha_nacimiento']), asyncHandler(async (req, res) => {
  const { dni, fecha_nacimiento } = req.query;

  const query = `SELECT * FROM citas WHERE dni = ? AND fecha_nacimiento = ? AND estado = 'activa'`;
  const [results] = await pool.execute(query, [dni, fecha_nacimiento]);

  if (results.length === 0) {
    return res.status(404).json({ 
      mensaje: '❌ No se encontró ninguna cita activa con esos datos' 
    });
  }

  res.json(results);
}));

// 📅 Consultar cupos disponibles
app.get('/cupos-disponibles', asyncHandler(async (req, res) => {
  const { fecha, consultorio, turno } = req.query;
  
  let query = `
    SELECT 
      consultorio,
      fecha,
      turno,
      cupos_totales,
      cupos_ocupados,
      (cupos_totales - cupos_ocupados) AS cupos_disponibles
    FROM cupos_disponibles 
    WHERE (cupos_totales - cupos_ocupados) > 0
  `;
  let params = [];
  
  if (fecha) {
    query += ` AND fecha = ?`;
    params.push(fecha);
  }
  
  if (consultorio) {
    query += ` AND consultorio LIKE ?`;
    params.push(`%${consultorio}%`);
  }
  
  if (turno) {
    query += ` AND turno = ?`;
    params.push(turno);
  }
  
  query += ` ORDER BY fecha ASC, consultorio ASC, turno ASC`;
  
  const [results] = await pool.execute(query, params);
  
  res.json({
    mensaje: '✅ Cupos disponibles',
    total: results.length,
    cupos: results
  });
}));




// 🏥 Gestionar cupos para un consultorio
app.post('/gestionar-cupos', validateRequired(['consultorio', 'fecha', 'turno', 'cupos_totales']), asyncHandler(async (req, res) => {
  const { consultorio, fecha, turno, cupos_totales } = req.body;
  
  // Validar que cupos_totales sea un número positivo
  if (isNaN(cupos_totales) || cupos_totales <= 0) {
    return res.status(400).json({ error: 'cupos_totales debe ser un número positivo' });
  }
  
  const query = `
    INSERT INTO cupos_disponibles (consultorio, fecha, turno, cupos_totales, cupos_ocupados)
    VALUES (?, ?, ?, ?, 0)
    ON DUPLICATE KEY UPDATE cupos_totales = VALUES(cupos_totales)
  `;
  
  await pool.execute(query, [consultorio, fecha, turno, cupos_totales]);
  
  res.json({ mensaje: '✅ Cupos gestionados correctamente' });
}));

// ➕ Crear cita CON CONTROL DE CUPOS
app.post('/crear-cita', validateRequired(['dni', 'fecha_nacimiento', 'fecha_cita', 'consultorio', 'turno']), asyncHandler(async (req, res) => {
  const {
    dni,
    fecha_nacimiento,
    fecha_cita,
    consultorio,
    prescriptor,
    turno
  } = req.body;

  // Validar formato de fecha
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(fecha_cita) || !fechaRegex.test(fecha_nacimiento)) {
    return res.status(400).json({ error: 'Formato de fecha inválido. Use YYYY-MM-DD' });
  }

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1️⃣ Verificar si hay cupos disponibles
    const [cuposResults] = await connection.execute(
      `SELECT cupos_totales, cupos_ocupados, 
              (cupos_totales - cupos_ocupados) as cupos_disponibles 
       FROM cupos_disponibles 
       WHERE consultorio = ? AND fecha = ? AND turno = ?`,
      [consultorio, fecha_cita, turno]
    );

    let cuposDisponibles;
    
    // Si no existe el registro de cupos, crearlo con 6 cupos por defecto
    if (cuposResults.length === 0) {
      await connection.execute(
        `INSERT INTO cupos_disponibles (consultorio, fecha, turno, cupos_totales, cupos_ocupados)
         VALUES (?, ?, ?, 6, 0)`,
        [consultorio, fecha_cita, turno]
      );
      cuposDisponibles = 6;
    } else {
      cuposDisponibles = cuposResults[0].cupos_disponibles;
      
      if (cuposDisponibles <= 0) {
        await connection.rollback();
        return res.status(400).json({ 
          error: '❌ No hay cupos disponibles',
          detalles: `${consultorio} - ${fecha_cita} - ${turno}` 
        });
      }
    }

    // 2️⃣ Verificar si ya existe una cita activa para este paciente en la misma fecha
    const [citasExistentes] = await connection.execute(
      `SELECT id FROM citas 
       WHERE dni = ? AND fecha_cita = ? AND estado = 'activa'`,
      [dni, fecha_cita]
    );

    if (citasExistentes.length > 0) {
      await connection.rollback();
      return res.status(400).json({ 
        error: '❌ Ya existe una cita activa para este paciente en la fecha seleccionada' 
      });
    }

    // 3️⃣ Obtener el siguiente número de cupo
    const [cupoResults] = await connection.execute(
      `SELECT COALESCE(MAX(numero_cupo), 0) + 1 as siguiente_cupo
       FROM citas 
       WHERE consultorio = ? AND fecha_cita = ? AND turno = ? AND estado = 'activa'`,
      [consultorio, fecha_cita, turno]
    );

    const numeroCupo = cupoResults[0].siguiente_cupo;

    // 4️⃣ Insertar la cita
    const [result] = await connection.execute(
      `INSERT INTO citas 
       (dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor, turno, numero_cupo, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'activa')`,
      [dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor || null, turno, numeroCupo]
    );

    // 5️⃣ Actualizar cupos ocupados
    await connection.execute(
      `UPDATE cupos_disponibles 
       SET cupos_ocupados = cupos_ocupados + 1
       WHERE consultorio = ? AND fecha = ? AND turno = ?`,
      [consultorio, fecha_cita, turno]
    );

    await connection.commit();

    res.status(201).json({
      mensaje: '✅ Cita creada correctamente',
      id: result.insertId,
      cupo: numeroCupo,
      consultorio: consultorio,
      fecha: fecha_cita,
      turno: turno
    });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en transacción:', error);
    res.status(500).json({ error: 'Error al crear la cita' });
  } finally {
    connection.release();
  }
}));

// 🗑️ Cancelar cita (libera cupo)
app.put('/cancelar-cita/:id', asyncHandler(async (req, res) => {
  const citaId = req.params.id;
  
  if (isNaN(citaId)) {
    return res.status(400).json({ error: 'ID de cita inválido' });
  }
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // 1️⃣ Obtener datos de la cita antes de cancelar
    const [citaResults] = await connection.execute(
      `SELECT consultorio, fecha_cita, turno FROM citas WHERE id = ? AND estado = 'activa'`,
      [citaId]
    );

    if (citaResults.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Cita no encontrada o ya cancelada' });
    }

    const { consultorio, fecha_cita, turno } = citaResults[0];

    // 2️⃣ Cancelar la cita
    await connection.execute(
      `UPDATE citas SET estado = 'cancelada' WHERE id = ?`,
      [citaId]
    );

    // 3️⃣ Liberar cupo
    await connection.execute(
      `UPDATE cupos_disponibles 
       SET cupos_ocupados = GREATEST(cupos_ocupados - 1, 0)
       WHERE consultorio = ? AND fecha = ? AND turno = ?`,
      [consultorio, fecha_cita, turno]
    );

    await connection.commit();

    res.json({ mensaje: '✅ Cita cancelada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Error en cancelación:', error);
    res.status(500).json({ error: 'Error al cancelar la cita' });
  } finally {
    connection.release();
  }
}));

// 📋 Listar todas las citas con paginación
app.get('/listar-citas', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;
  
  const [results] = await pool.execute(
    `SELECT * FROM citas 
     ORDER BY fecha_cita DESC, consultorio ASC, numero_cupo ASC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  
  const [countResult] = await pool.execute(
    `SELECT COUNT(*) as total FROM citas`
  );
  
  const total = countResult[0].total;
  const totalPages = Math.ceil(total / limit);
  
  if (results.length === 0) {
    return res.status(404).json({ mensaje: '❌ No hay citas registradas' });
  }
  
  res.json({
    mensaje: '✅ Citas encontradas',
    total: total,
    page: page,
    totalPages: totalPages,
    citas: results
  });
}));

// 🔍 Búsqueda filtrada de citas
app.get('/citas-filtradas', asyncHandler(async (req, res) => {
  const { turno, consultorio, fecha_cita, dni, fecha_nacimiento, estado } = req.query;
  
  let query = `SELECT * FROM citas WHERE 1=1`;
  let params = [];
  
  if (dni) {
    query += ` AND dni = ?`;
    params.push(dni);
  }
  
  if (fecha_nacimiento) {
    query += ` AND fecha_nacimiento = ?`;
    params.push(fecha_nacimiento);
  }
  
  if (turno) {
    query += ` AND turno = ?`;
    params.push(turno);
  }
  
  if (consultorio) {
    query += ` AND consultorio = ?`;
    params.push(consultorio);
  }
  
  if (fecha_cita) {
    query += ` AND fecha_cita = ?`;
    params.push(fecha_cita);
  }

  if (estado) {
    query += ` AND estado = ?`;
    params.push(estado);
  } else {
    query += ` AND estado = 'activa'`;
  }
  
  query += ` ORDER BY fecha_cita DESC, consultorio ASC, numero_cupo ASC`;
  
  const [results] = await pool.execute(query, params);
  
  if (results.length === 0) {
    return res.status(404).json({ 
      mensaje: '❌ No se encontraron citas con los filtros especificados' 
    });
  }
  
  res.json({
    mensaje: '✅ Citas encontradas',
    total: results.length,
    filtros: { dni, fecha_nacimiento, turno, consultorio, fecha_cita, estado },
    citas: results
  });
}));

// 📊 Estadísticas del sistema
app.get('/estadisticas', asyncHandler(async (req, res) => {
  const [citasStats] = await pool.execute(`
    SELECT 
      estado,
      COUNT(*) as cantidad
    FROM citas 
    GROUP BY estado
  `);
  
  const [cuposStats] = await pool.execute(`
    SELECT 
      consultorio,
      SUM(cupos_totales) as total_cupos,
      SUM(cupos_ocupados) as cupos_ocupados,
      SUM(cupos_totales - cupos_ocupados) as cupos_disponibles
    FROM cupos_disponibles 
    GROUP BY consultorio
  `);
  
  res.json({
    mensaje: '✅ Estadísticas del sistema',
    citas_por_estado: citasStats,
    cupos_por_consultorio: cuposStats
  });
}));

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Cierre elegante del servidor
process.on('SIGINT', async () => {
  console.log('🔄 Cerrando servidor...');
  await pool.end();
  console.log('✅ Pool de conexiones cerrado');
  process.exit(0);
});

app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
});