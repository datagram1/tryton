#!/usr/bin/env python3
"""
Load demo data using XML-RPC instead of direct trytond connection
"""
import sys
import xmlrpc.client

# Configuration
SERVER_URL = 'http://localhost:8001/'
DATABASE = 'demo'
USERNAME = 'admin'
PASSWORD = 'admin'  # Default admin password

def main():
    print(f"Connecting to {SERVER_URL} database '{DATABASE}'...")

    # Create server connection
    server = xmlrpc.client.ServerProxy(SERVER_URL, allow_none=True, use_builtin_types=True)

    # Login
    try:
        print(f"Logging in as {USERNAME}...")
        result = server.common.db.login(USERNAME, {'password': PASSWORD})
        session_id = ':'.join(map(str, [USERNAME] + result))
        print(f"Logged in successfully!")
    except Exception as e:
        print(f"Login failed: {e}")
        print(f"\nTrying to create admin user first...")

        # If login fails, it's likely because the database is empty
        # Try to initialize it first
        print(f"Database needs initialization. Please run: trytond-admin -c trytond.conf -d demo --all")
        return 1

    # At this point we have a working connection
    # The demo data loading would go here
    print(f"\nConnection successful!")
    print(f"Session ID: {session_id}")

    # List available models
    try:
        models = server.model.ir.model.search([], 0, 10, None)
        print(f"\nFound {len(models)} models (showing first 10)")
    except Exception as e:
        print(f"Error listing models: {e}")

    return 0

if __name__ == '__main__':
    sys.exit(main())
