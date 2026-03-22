from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import router
app = FastAPI()
app.include_router(router)  # 👈 importante
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # 👈 importante
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)