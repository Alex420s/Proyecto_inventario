from sqlalchemy import Column, String, Float, Integer
from database import Base
from database import engine
# ── MODELO ─────────────────────────────────────
class Product(Base):
    __tablename__ = "products"

    barcode = Column(String, primary_key=True, index=True)
    name = Column(String)
    purchase_price = Column(Float)
    sale_price = Column(Float)
    stock = Column(Integer)
    monthly_sales = Column(Integer, default=0)
    expiration = Column(String, nullable=True)
    supplier = Column(String, nullable=True)



Base.metadata.create_all(bind=engine)

