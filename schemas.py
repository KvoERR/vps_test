from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# Схема для получения данных от фронтенда при создании бронирования
class BookingIn(BaseModel):
    cost: float

class PaymentIn(BaseModel):
    amount: float

# Схема для отправки данных обратно на фронтенд
class BookingOut(BaseModel):
    id: int
    cost: float
    paid: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True  # Важно для SQLAlchemy 2.0