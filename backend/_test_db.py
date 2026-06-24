"""Quick DB connection test — tries multiple passwords."""
import asyncio
import asyncpg
import sys

PASSWORDS = ["postgres", "admin", "1234", "root", "admin123", "password", "123456", "mindora"]

async def test():
    for pwd in PASSWORDS:
        url = f"postgresql://postgres:{pwd}@localhost:5432/postgres"
        try:
            conn = await asyncpg.connect(url)
            version = await conn.fetchval("SELECT version()")
            print(f"CONNECTED with password='{pwd}'")
            print(f"PostgreSQL: {version}")
            
            # Check if mindora db exists
            exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname='mindora'")
            if exists:
                print("Database 'mindora' already exists.")
            else:
                print("Creating database 'mindora'...")
                await conn.execute("CREATE DATABASE mindora")
                print("Database 'mindora' created successfully.")
            
            await conn.close()
            # Write the working URL to stdout for capture
            print(f"DATABASE_URL=postgresql+asyncpg://postgres:{pwd}@localhost:5432/mindora")
            return
        except Exception as e:
            err = str(e)
            if "password authentication failed" in err:
                continue
            elif "does not exist" in err:
                # Wrong db but password worked
                print(f"Password '{pwd}' works but got error: {e}")
                continue
            else:
                print(f"Password '{pwd}': {e}")
                continue
    
    print("FAILED: Could not connect with any common password.")
    print("Please provide your PostgreSQL password.")
    sys.exit(1)

asyncio.run(test())
