DEFINE TABLE IF NOT EXISTS events SCHEMAFULL;

DEFINE FIELD IF NOT EXISTS event_binary_hash ON TABLE events TYPE array<number>;
DEFINE FIELD IF NOT EXISTS signature ON TABLE events TYPE array<number>;
DEFINE FIELD IF NOT EXISTS account_id ON TABLE events TYPE array<number>;
DEFINE FIELD IF NOT EXISTS time ON TABLE events TYPE datetime;
DEFINE FIELD IF NOT EXISTS event_binary ON TABLE events TYPE array<number>;
DEFINE FIELD IF NOT EXISTS server_receive_timestamp ON TABLE events TYPE datetime;
DEFINE FIELD IF NOT EXISTS address ON TABLE events TYPE string;
DEFINE FIELD IF NOT EXISTS event_type ON TABLE events TYPE string;

DEFINE INDEX IF NOT EXISTS idx_events_time ON TABLE events COLUMNS time;
DEFINE INDEX IF NOT EXISTS idx_events_type ON TABLE events COLUMNS event_type;
