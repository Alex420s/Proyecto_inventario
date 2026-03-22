from fastapi import  APIRouter
from schemas import ProductCreate, SaleItem
from database import SessionLocal
from models import Product

router = APIRouter() 
# ── ROUTES ─────────────────────────────────────
@router.get("/products/{barcode}")
def get_product(barcode: str):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.barcode == barcode).first()

        if not product:
            return {"found": False, "product": None}

        return {
            "found": True,
            "product": {
                "barcode": product.barcode,
                "name": product.name,
                "sale_price": product.sale_price,
                "stock": product.stock
            }
        }
    finally:
        db.close()


@router.post("/products/")
def create_product(data: ProductCreate):
    db = SessionLocal()

    product = Product(**data.dict())
    db.add(product)
    db.commit()
    db.refresh(product)
    db.close()

    return product


@router.post("/sales/")


@router.post("/sales/")
def create_sale(items: list[SaleItem]):

    db = SessionLocal()

    total = 0
    for item in items:
        product = db.query(Product).filter(Product.barcode == item["barcode"]).first()
        if not product:
            return {
                "error": f"Producto {item['barcode']} no encontrado"
            }
        product.stock -= item["quantity"]
        product.monthly_sales += item["quantity"]

        total += product.sale_price * item["quantity"]

    db.commit()
    db.close()

    return {"total": total}