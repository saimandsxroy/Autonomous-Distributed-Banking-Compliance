CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(150),
    aml_monitoring_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS config_treasury_app (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL
) ENGINE=InnoDB;

INSERT INTO config_treasury_app (config_key, config_value) VALUES
('GEMINI_API_URL', 'https://generativelanguage.googleapis.com/v1beta/models/<MODEL_NAME>:generateContent?key=<API_KEY>'),
('GEMINI_MODEL_NAME', 'gemini-2.5-flash'),
('VELOCITY_MAX_TX_2M', '5'),
('HIGH_VALUE_HOLD_THRESHOLD', '10000.0000'),
('AML_MAX_HOP_DEPTH', '5');

