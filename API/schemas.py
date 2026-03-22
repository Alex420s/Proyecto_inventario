from pydantic import BaseModel
# ── SCHEMAS ────────────────────────────────────
class ProductCreate(BaseModel):
    barcode: str
    name: str
    purchase_price: float
    sale_price: float
    stock: int
    expiration: str | None = None
    supplier: str | None = None

class SaleItem(BaseModel):
    barcode: str
    quantity: int