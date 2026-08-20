# bookings.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import schemas
import database
from models import Booking  

router = APIRouter()

# Зависимость для получения сессии БД
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/bookings", response_model=List[schemas.BookingOut])
def read_bookings(db: Session = Depends(get_db)):
    """Получить все бронирования"""
    # 🔥 ИЗМЕНЕНО: Используем Booking из импорта, а не из database
    bookings = db.query(Booking).all()
    return bookings

@router.post("/bookings", response_model=schemas.BookingOut)
def create_booking(booking_in: schemas.BookingIn, db: Session = Depends(get_db)):
    """Создать новое бронирование"""
    # 🔥 ИЗМЕНЕНО: Используем Booking из импорта
    new_booking = Booking(
        cost=booking_in.cost,
        paid=0.0,
        status="new"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)  # Обновляем данные из БД (чтобы получить ID)
    return new_booking

@router.post("/bookings/{booking_id}/pay", response_model=schemas.BookingOut)
def pay_booking(booking_id: int, payment: schemas.PaymentIn, db: Session = Depends(get_db)):
    """Оплатить часть суммы"""
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
    
    if booking.status == "cancelled":
        raise HTTPException(status_code=400, detail="Нельзя оплатить отменённое бронирование")
    
    if booking.status == "paid":
        raise HTTPException(status_code=400, detail="Бронирование уже оплачено")

    new_paid = booking.paid + payment.amount
    if new_paid > booking.cost:
        raise HTTPException(status_code=400, detail="Сумма оплаты превышает стоимость бронирования")

    booking.paid = new_paid
    
    if booking.paid >= booking.cost:
        booking.status = "paid"
    
    db.commit()
    db.refresh(booking)
    return booking

@router.post("/bookings/{booking_id}/cancel", response_model=schemas.BookingOut)
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    """Отменить бронирование"""
    # 🔥 ИЗМЕНЕНО: Используем Booking из импорта
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(status_code=404, detail="Бронирование не найдено")
        
    if booking.status == "paid":
        raise HTTPException(status_code=400, detail="Нельзя отменить оплаченное бронирование")
        
    booking.status = "cancelled"
    db.commit()
    db.refresh(booking)
    return booking