from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(
    settings.mongo_uri,
    maxPoolSize=50,
    minPoolSize=10,
    maxIdleTimeMS=45000,
    serverSelectionTimeoutMS=5000,
    socketTimeoutMS=10000,
)
db = client[settings.mongo_db_name]


def get_db():
    return db


def close_db():
    client.close()
