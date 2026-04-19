from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    colbert_model_path:str = "/home/liwei/ai/colqwen2.5-v0.2"

    class Config:
        env_file = "../.env"


settings = Settings()
# print(settings.mongodb_url)  # 这里应只打印 "localhost:27017"
