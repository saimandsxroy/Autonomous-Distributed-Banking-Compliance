-- Phase 9: JWT Authentication Config
INSERT INTO config_treasury_app (config_key, config_value)
VALUES ('JWT_SECRET_KEY', 'runestone_treasury_jwt_hs256_secret_minimum_256bits_2024_prod')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);
