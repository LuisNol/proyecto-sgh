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
VALUES ('12345678', '1990-01-01', '2025-06-20', 'Consultorio 1', 'Dr. Pérez', 'Mañana', 5),
('42138765', '1995-04-23', '2025-06-12', 'Medicina General', 'Dr. Luis Rojas', 'Mañana', 1),
('47896512', '1988-10-15', '2025-06-12', 'Ginecología', 'Dra. María Huamán', 'Mañana', 2),
('52348976', '1992-07-30', '2025-06-12', 'Pediatría', 'Dr. Carlos Rivera', 'Mañana', 3),
('49781234', '1975-12-05', '2025-06-12', 'Dermatología', 'Dra. Juana Ramírez', 'Mañana', 4),
('45639871', '2001-03-10', '2025-06-12', 'Odontología', 'Dr. Miguel Salas', 'Mañana', 5);

