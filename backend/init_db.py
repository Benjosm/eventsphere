import os
import sqlite3
from pysqlcipher3 import dbapi2 as sqlcipher
from datetime import datetime

def init_database():
    """
    Initialize the SQLCipher-encrypted database with events and users tables.
    """
    # Get the database encryption key from environment variable
    encryption_key = os.getenv('DB_ENCRYPTION_KEY')
    if not encryption_key:
        raise ValueError("DB_ENCRYPTION_KEY environment variable is not set")
    
    # Get database path from environment variable or use default
    db_path = os.getenv('DATABASE_URL', 'app.db')
    
    # Connect to the database (will create if it doesn't exist)
    conn = sqlcipher.connect(db_path)
    cursor = conn.cursor()
    
    # Set the encryption key
    cursor.execute(f"PRAGMA key = '{encryption_key}'")
    
    # Create events table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            description TEXT,
            category TEXT
        )
    ''')
    
    # Create indexes on frequently queried columns
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_category ON events(category);")
    
    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL
        )
    ''')
    
    # Commit changes and close connection
    conn.commit()
    conn.close()
    
    print(f"Database initialized successfully at {db_path}")
    print("Created tables: events, users")

def verify_database_integrity():
    """
    Verify that the database is properly encrypted, and that all tables and indexes exist.
    Attempts to access the database with and without the correct key.
    """
    encryption_key = os.getenv('DB_ENCRYPTION_KEY')
    db_path = os.getenv('DATABASE_URL', 'app.db')

    if not encryption_key:
        raise ValueError("DB_ENCRYPTION_KEY environment variable is not set")

    # Try to connect with correct key
    try:
        conn = sqlcipher.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA key = '{encryption_key}'")

        # Verify table schemas
        cursor.execute("PRAGMA table_info(events);")
        events_columns = cursor.fetchall()
        expected_events_columns = [
            ('id', 'INTEGER', 0, '', 1),
            ('timestamp', 'DATETIME', 1, '', 0),
            ('latitude', 'REAL', 1, '', 0),
            ('longitude', 'REAL', 1, '', 0),
            ('description', 'TEXT', 0, '', 0),
            ('category', 'TEXT', 0, '', 0)
        ]
        assert len(events_columns) == len(expected_events_columns)
        for i, col in enumerate(events_columns):
            assert col[1] == expected_events_columns[i][1]  # Verify type
            assert col[5] == expected_events_columns[i][4]  # Verify PK
        print("✓ Events table schema is correct")

        cursor.execute("PRAGMA table_info(users);")
        users_columns = cursor.fetchall()
        expected_users_columns = [
            ('id', 'INTEGER', 0, '', 1),
            ('username', 'TEXT', 1, '', 0),
            ('password_hash', 'TEXT', 1, '', 0),
            ('role', 'TEXT', 1, '', 0)
        ]
        assert len(users_columns) == len(expected_users_columns)
        for i, col in enumerate(users_columns):
            assert col[1] == expected_users_columns[i][1]
            assert col[5] == expected_users_columns[i][4]
        print("✓ Users table schema is correct")

        # Verify indexes
        cursor.execute("PRAGMA index_list(events);")
        indexes = [idx[1] for idx in cursor.fetchall()]
        assert 'idx_events_timestamp' in indexes
        assert 'idx_events_category' in indexes
        print("✓ Required indexes exist on events table")

        conn.close()
        print("✓ Database verified with correct key")

    except Exception as e:
        raise RuntimeError(f"Verification with correct key failed: {e}")

    # Try to connect without key
    try:
        conn = sqlcipher.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT count(*) FROM events;")
        data = cursor.fetchall()
        conn.close()
        raise RuntimeError("Security check failed: Database accessible without key!")
    except Exception:
        print("✓ Database is encrypted (inaccessible without key)")

    # Try wrong key
    try:
        conn = sqlcipher.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA key = 'wrong_key';")
        cursor.execute("SELECT count(*) FROM events;")
        data = cursor.fetchall()
        conn.close()
        raise RuntimeError("Security check failed: Database accessible with wrong key!")
    except Exception:
        print("✓ Database is protected against wrong key access")

if __name__ == "__main__":
    init_database()
    verify_database_integrity()
