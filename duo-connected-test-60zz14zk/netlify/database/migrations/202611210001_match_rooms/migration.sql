CREATE TABLE IF NOT EXISTS hangman_rooms (
 code varchar(10) PRIMARY KEY,
 state jsonb NOT NULL,
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS hangman_rooms_expiry_idx ON hangman_rooms (expires_at);
