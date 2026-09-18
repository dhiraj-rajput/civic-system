from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "civic_complaints"
    jwt_secret: str = "change_me_before_deploy"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # Garage S3 Object Storage Settings
    s3_endpoint_url: str = "http://localhost:3900"
    s3_public_url: str = "http://localhost:3900"
    s3_bucket: str = "civic-media"
    s3_access_key: str = "garage_key"
    s3_secret_key: str = "garage_secret"
    s3_region: str = "garage"
    local_storage_dir: str = "uploads"


settings = Settings()
