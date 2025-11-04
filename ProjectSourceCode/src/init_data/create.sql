-- Create Users table, stores usernames, passwords, and user ids of users
CREATE TABLE IF NOT EXISTS users (
  user_id BIGSERIAL PRIMARY KEY,
  username VARCHAR(30) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,             -- bcrypt/argon2 hash
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create three Leaderboard table, stores best score and number of wins for all users each game
-- Connected by foregin key user_id, references Users
-- Also lists time when a user's score/wins was last updated
CREATE TABLE IF NOT EXISTS blackjack_leaderboard(
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    best_score INT NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mines_leaderboard(
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    best_score INT NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS slots_leaderboard(
    user_id BIGINT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    wins INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    best_score INT NOT NULL DEFAULT 0 CHECK (best_score >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);