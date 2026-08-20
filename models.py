from sqlalchemy import Column, Integer, Float, String, DateTime
from database import Base
import datetime

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    cost = Column(Float, nullable=False)
    paid = Column(Float, default=0.0)
    status = Column(String, default="new")  # new, paid, cancelled
    created_at = Column(DateTime, default=datetime.datetime.utcnow)