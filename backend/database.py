from motor.motor_asyncio import AsyncIOMotorClient
import os

# Default to local MongoDB, but allow Env Var override for Cloud (Atlas)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = "offline_rag_db"

class Database:
    client: AsyncIOMotorClient = None
    
    def connect(self):
        """Create database connection."""
        print(f"Connecting to MongoDB at {MONGO_URI}...")
        self.client = AsyncIOMotorClient(MONGO_URI)
        print("✅ MongoDB Connected")

    def close(self):
        """Close database connection."""
        if self.client:
            self.client.close()
            print("MongoDB Connection Closed")

    @property
    def db(self):
        return self.client[DB_NAME]
    
    @property
    def users(self):
        return self.db["users"]
    
    @property
    def documents(self):
        return self.db["documents"]

# Singleton instance
db = Database()
