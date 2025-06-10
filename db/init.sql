CREATE TABLE IF NOT EXISTS citas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dni VARCHAR(10) NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  fecha_cita DATE NOT NULL,
  consultorio VARCHAR(50),
  prescriptor VARCHAR(100),
  turno VARCHAR(20),
  numero_cupo INT
);

INSERT INTO citas (dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor, turno, numero_cupo)
VALUES ('12345678', '1990-01-01', '2025-06-20', 'Consultorio 1', 'Dr. Pérez', 'Mañana', 5);
