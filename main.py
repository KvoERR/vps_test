# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base
from bookings import router
import os

# Инициализация приложения
app = FastAPI(title="Booking Service")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(router, prefix="/api")

# --- ДОБАВЛЕНО: Подключение статики ---
# Создаем директорию static, если её нет
if not os.path.exists("static"):
    os.makedirs("static")

# Маунтим папку static
app.mount("/static", StaticFiles(directory="static"), name="static")

# Обработчик для главной страницы
@app.get("/")
def read_root():
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)