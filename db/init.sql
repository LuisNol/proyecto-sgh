-- Script para crear las tablas del Sistema de Gestión Hospitalaria (SGH)

USE sgh_db;

-- Tabla para gestionar los cupos disponibles por consultorio
CREATE TABLE IF NOT EXISTS cupos_disponibles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consultorio VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    turno ENUM('mañana', 'tarde', 'noche') NOT NULL,
    cupos_totales INT NOT NULL DEFAULT 6,
    cupos_ocupados INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cupo (consultorio, fecha, turno),
    INDEX idx_fecha (fecha),
    INDEX idx_consultorio (consultorio),
    INDEX idx_disponibles (consultorio, fecha, turno)
);

-- Tabla para las citas médicas
CREATE TABLE IF NOT EXISTS citas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dni VARCHAR(20) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    fecha_cita DATE NOT NULL,
    consultorio VARCHAR(100) NOT NULL,
    prescriptor VARCHAR(200) NULL,
    turno ENUM('mañana', 'tarde', 'noche') NOT NULL,
    numero_cupo INT NOT NULL,
    estado ENUM('activa', 'cancelada', 'completada') NOT NULL DEFAULT 'activa',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_dni (dni),
    INDEX idx_fecha_cita (fecha_cita),
    INDEX idx_consultorio (consultorio),
    INDEX idx_estado (estado),
    INDEX idx_paciente (dni, fecha_nacimiento),
    INDEX idx_cupo (consultorio, fecha_cita, turno, numero_cupo)
);

-- Insertar algunos datos de ejemplo para cupos disponibles
INSERT INTO cupos_disponibles (consultorio, fecha, turno, cupos_totales, cupos_ocupados) VALUES
('Cardiología', '2025-06-13', 'mañana', 8, 2),
('Cardiología', '2025-06-13', 'tarde', 6, 1),
('Traumatología', '2025-06-13', 'mañana', 10, 3),
('Traumatología', '2025-06-13', 'tarde', 8, 0),
('Pediatría', '2025-06-14', 'mañana', 12, 5),
('Pediatría', '2025-06-14', 'tarde', 10, 2),
('Ginecología', '2025-06-14', 'mañana', 6, 1),
('Ginecología', '2025-06-14', 'tarde', 8, 0);

-- Insertar algunas citas de ejemplo
INSERT INTO citas (dni, fecha_nacimiento, fecha_cita, consultorio, prescriptor, turno, numero_cupo, estado) VALUES
('12345678', '1990-05-15', '2025-06-13', 'Cardiología', 'Dr. García', 'mañana', 1, 'activa'),
('87654321', '1985-08-22', '2025-06-13', 'Cardiología', 'Dr. López', 'mañana', 2, 'activa'),
('11223344', '1992-03-10', '2025-06-13', 'Cardiología', 'Dr. Martínez', 'tarde', 1, 'activa'),
('55667788', '1988-12-05', '2025-06-13', 'Traumatología', 'Dr. Rodríguez', 'mañana', 1, 'activa'),
('99887766', '1995-07-18', '2025-06-13', 'Traumatología', 'Dr. Fernández', 'mañana', 2, 'activa'),
('44556677', '1987-11-30', '2025-06-13', 'Traumatología', 'Dr. Sánchez', 'mañana', 3, 'activa');
('90010101', '1981-01-01', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 1, 'activa'),
('90010102', '1975-03-15', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 2, 'activa'),
('90010103', '1960-07-21', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 3, 'completada'),
('90010104', '1990-12-02', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 4, 'completada'),
('90010105', '1988-08-08', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 5, 'cancelada'),
('90010106', '1995-05-17', '2025-06-25', 'Urología', 'Dr. Mejía', 'mañana', 6, 'activa'),
('90010107', '1970-02-09', '2025-06-26', 'Odontología', 'Dra. Salas', 'mañana', 1, 'activa'),
('90010108', '1983-06-11', '2025-06-26', 'Odontología', 'Dra. Salas', 'tarde', 2, 'activa'),
('90010109', '1991-11-22', '2025-06-27', 'Oftalmología', 'Dr. Ruiz', 'mañana', 1, 'completada'),
('90010110', '2000-09-30', '2025-06-27', 'Oftalmología', 'Dr. Ruiz', 'noche', 1, 'activa'),
('90010111', '1982-04-05', '2025-06-28', 'Psicología', 'Dra. Rivas', 'mañana', 2, 'activa'),
('90010112', '1986-03-03', '2025-06-28', 'Psicología', 'Dra. Rivas', 'tarde', 1, 'activa'),
('90010113', '1997-07-07', '2025-07-01', 'Nutrición', 'Lic. Romero', 'mañana', 1, 'activa'),
('90010114', '1979-10-23', '2025-07-01', 'Nutrición', 'Lic. Romero', 'tarde', 2, 'cancelada'),
('90010115', '1993-12-12', '2025-07-02', 'Dermatología', 'Dr. Vega', 'mañana', 1, 'activa'),
('90010116', '1985-08-18', '2025-07-02', 'Dermatología', 'Dr. Vega', 'tarde', 2, 'completada'),
('90010117', '1969-01-20', '2025-07-03', 'Medicina General', 'Dr. Bravo', 'mañana', 3, 'activa'),
('90010118', '1994-04-04', '2025-07-03', 'Medicina General', 'Dr. Bravo', 'noche', 1, 'activa'),
('90010119', '2001-06-30', '2025-07-04', 'Otorrinolaringología', 'Dr. Lazo', 'mañana', 1, 'activa'),
('90010120', '1976-11-11', '2025-07-04', 'Otorrinolaringología', 'Dr. Lazo', 'tarde', 2, 'completada'),
('90010121', '1980-02-28', '2025-07-05', 'Reumatología', 'Dr. Peña', 'mañana', 1, 'cancelada'),
('90010122', '1999-09-19', '2025-07-05', 'Reumatología', 'Dr. Peña', 'mañana', 2, 'activa'),
('90010123', '1987-03-13', '2025-07-05', 'Reumatología', 'Dr. Peña', 'mañana', 3, 'activa'),
('90010124', '1966-05-06', '2025-07-05', 'Reumatología', 'Dr. Peña', 'mañana', 4, 'completada'),
('90010125', '1992-10-30', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 1, 'activa'),
('90010126', '1984-07-07', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 2, 'activa'),
('90010127', '2002-01-01', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 3, 'completada'),
('90010128', '1973-12-12', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 4, 'activa'),
('90010129', '1990-10-01', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 5, 'activa'),
('90010130', '1981-11-21', '2025-07-06', 'Endocrinología', 'Dr. Chávez', 'mañana', 6, 'cancelada');

-- Verificar que las tablas se crearon correctamente
SHOW TABLES;

-- Mostrar la estructura de las tablas
DESCRIBE cupos_disponibles;
DESCRIBE citas;