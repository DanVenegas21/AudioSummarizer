-- Script SQL para crear la tabla users en Supabase
-- Ejecuta este script en el SQL Editor de Supabase si la tabla no existe

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role SMALLINT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índice en el email para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comentarios para documentación
COMMENT ON TABLE users IS 'Tabla de usuarios del sistema';
COMMENT ON COLUMN users.id IS 'ID único del usuario';
COMMENT ON COLUMN users.first_name IS 'Nombre del usuario';
COMMENT ON COLUMN users.last_name IS 'Apellido del usuario';
COMMENT ON COLUMN users.email IS 'Email del usuario (único)';
COMMENT ON COLUMN users.password IS 'Contraseña hasheada con SHA-256';
COMMENT ON COLUMN users.role IS 'Rol del usuario (1=normal, 2=admin)';
COMMENT ON COLUMN users.created_at IS 'Fecha de creación del usuario';

