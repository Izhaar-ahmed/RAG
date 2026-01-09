import asyncio
from backend.database import db
from backend.auth import get_password_hash

async def seed_users():
    print("Connecting to MongoDB...")
    db.connect()
    
    users = [
        {
            "email": "admin@company.com",
            "password": "admin",
            "full_name": "System Administrator",
            "role": "admin"
        },
        {
            "email": "user@company.com",
            "password": "user",
            "full_name": "Standard Employee",
            "role": "user"
        }
    ]
    
    for u in users:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            # Update role and password to be sure
            print(f"Updating existing user: {u['email']}...")
            await db.users.update_one(
                {"email": u["email"]}, 
                {
                    "$set": {
                        "role": u["role"], 
                        "hashed_password": get_password_hash(u["password"])
                    }
                }
            )
        else:
            print(f"Creating new user: {u['email']}...")
            user_dict = {
                "email": u["email"],
                "hashed_password": get_password_hash(u["password"]),
                "full_name": u["full_name"],
                "role": u["role"],
                "disabled": False
            }
            await db.users.insert_one(user_dict)
    
    print("\nSuccess! Database seeded.")
    print("-------------------------------------------------")
    print("Admin Login: admin@company.com / admin")
    print("User  Login: user@company.com  / user")
    print("-------------------------------------------------")

    db.close()

if __name__ == "__main__":
    asyncio.run(seed_users())
