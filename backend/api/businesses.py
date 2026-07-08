from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.business import Business, BusinessCreate, BusinessRead

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.get("/", response_model=list[BusinessRead])
def list_businesses(db: Session = Depends(get_db)):
    return db.query(Business).all()


@router.post("/", response_model=BusinessRead, status_code=201)
def create_business(payload: BusinessCreate, db: Session = Depends(get_db)):
    business = Business(**payload.model_dump())
    db.add(business)
    db.commit()
    db.refresh(business)
    return business


@router.get("/{business_id}", response_model=BusinessRead)
def get_business(business_id: int, db: Session = Depends(get_db)):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")
    return business
