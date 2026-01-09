import asyncio
import os
from backend.database import db
from backend.auth import get_password_hash
from backend.models import UserCreate

async def create_admin():
    print("Connecting to MongoDB...")
    db.connect()
    
    email = input("Enter Admin Email: ")
    password = input("Enter Admin Password: ")
    full_name = input("Enter Full Name: ")
    
    # Check existing
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"User {email} exists. Updating role to 'admin'...")
        await db.users.update_one({"email": email}, {"$set": {"role": "admin"}})
        print("Updated successfully.")
    else:
        print(f"Creating new admin user {email}...")
        hashed = get_password_hash(password)
        user_dict = {
            "email": email,
            "hashed_password": hashed,
            "full_name": full_name,
            "role": "admin",
            "disabled": False
        }
        await db.users.insert_one(user_dict)
        print("Admin user created successfully.")

    db.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
