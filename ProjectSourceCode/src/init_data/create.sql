-- Create Users table, stores usernames, passwords, and user ids of users
-- Also stores time of when user account was created
-- Hash password for privacy
CREATE TABLE IF NOT EXISTS users (
    user_id      BIGSERIAL PRIMARY KEY,
    fname        VARCHAR(255) NOT NULL,
    lname        VARCHAR(255) NOT NULL,
    email        VARCHAR(255) NOT NULL,
    username     VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    balance      BIGINT NOT NULL DEFAULT 1000 CHECK (balance >= 0),
    wins        INT NOT NULL DEFAULT 0 CHECK (wins >= 0),
    daily_added_credits INT NOT NULL DEFAULT 0,
    last_credit_topup_date DATE
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

-- Log all balance changes (wins/losses + wallet adds)
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type           VARCHAR(40) NOT NULL,   -- 'wallet_add', 'slots', 'blackjack', 'mines'
  amount         BIGINT NOT NULL,        -- + = credit, - = debit (net change)
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

