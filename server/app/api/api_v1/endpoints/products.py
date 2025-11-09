"""
Products API endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
import logging
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func as sql_func, desc

from ....models.product import Product, ProductType
from ....models.user import User
from ....schemas.product import ProductCreate, ProductUpdate, ProductResponse
from ....core.database import get_db
from ....middleware.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=List[ProductResponse])
async def list_products(
    subject: Optional[str] = Query(None, description="Filter by subject code"),
    type: Optional[ProductType] = Query(None, description="Filter by product type"),
    semester: Optional[str] = Query(None, description="Filter by semester"),
    group: Optional[str] = Query(None, description="Filter by group"),
    instructor: Optional[str] = Query(None, description="Filter by instructor"),
    skip: int = Query(0, ge=0, description="Number of products to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Number of products to return"),
    db: Session = Depends(get_db)
):
    """List all products with optional filtering"""
    try:
        query = select(Product)
        conditions = []
        
        if subject:
            conditions.append(Product.subject == subject)
        if type:
            conditions.append(Product.type == type)
        if semester:
            conditions.append(Product.semester == semester)
        if group:
            conditions.append(Product.group == group)
        if instructor:
            conditions.append(Product.instructor == instructor)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.offset(skip).limit(limit)
        
        result = db.execute(query)
        products = result.scalars().all()
        
        logger.info(f"Retrieved {len(products)} products")
        return [ProductResponse.model_validate(product) for product in products]
        
    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving products: {str(e)}")


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific product by ID"""
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return ProductResponse.model_validate(product)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving product: {str(e)}")


@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new product"""
    try:
        logger.info(f"Creating product: {product_data.title}")
        
        product = Product(
            title=product_data.title,
            description=product_data.description,
            subject=product_data.subject,
            subject_name=product_data.subject_name,
            group=product_data.group,
            members=product_data.members,
            instructor=product_data.instructor,
            semester=product_data.semester,
            type=product_data.type,
            technologies=product_data.technologies,
            file_url=product_data.file_url,
            demo_url=product_data.demo_url,
            downloads=0,
            views=0,
            submitted_date=datetime.utcnow()
        )
        
        db.add(product)
        db.commit()
        db.refresh(product)
        logger.info(f"Product created successfully: {product.id}")
        
        return ProductResponse.model_validate(product)
        
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an existing product"""
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        update_data = product_data.dict(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(product, field, value)
            
            db.commit()
            db.refresh(product)
            logger.info(f"Product updated successfully: {product_id}")
        
        return ProductResponse.model_validate(product)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a product"""
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        db.delete(product)
        db.commit()
        logger.info(f"Product deleted successfully: {product_id}")
        
        return {"message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")


@router.post("/{product_id}/view")
async def increment_product_views(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Increment view count for a product"""
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product.views += 1
        db.commit()
        db.refresh(product)
        
        return {"message": "View count incremented", "views": product.views}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing views for product {product_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error incrementing views: {str(e)}")


@router.post("/{product_id}/download")
async def increment_product_downloads(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Increment download count for a product"""
    try:
        result = db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product.downloads += 1
        db.commit()
        db.refresh(product)
        
        return {"message": "Download count incremented", "downloads": product.downloads}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing downloads for product {product_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error incrementing downloads: {str(e)}")


@router.get("/stats/summary")
async def get_products_stats(
    db: Session = Depends(get_db)
):
    """Get summary statistics for products"""
    try:
        # Get total count
        total_products = db.execute(select(sql_func.count(Product.id))).scalar() or 0
        
        # Get count by subject
        subjects_query = select(
            Product.subject,
            Product.subject_name,
            sql_func.count(Product.id).label('count')
        ).group_by(Product.subject, Product.subject_name).order_by(desc('count'))
        subjects_result = db.execute(subjects_query).all()
        subjects_stats = [{"_id": row.subject, "count": row.count, "subject_name": row.subject_name} for row in subjects_result]
        
        # Get count by type
        types_query = select(
            Product.type,
            sql_func.count(Product.id).label('count')
        ).group_by(Product.type).order_by(desc('count'))
        types_result = db.execute(types_query).all()
        types_stats = [{"_id": row.type, "count": row.count} for row in types_result]
        
        # Get total downloads and views
        totals_query = select(
            sql_func.sum(Product.downloads).label('total_downloads'),
            sql_func.sum(Product.views).label('total_views')
        )
        totals_result = db.execute(totals_query).first()
        total_downloads = totals_result.total_downloads or 0
        total_views = totals_result.total_views or 0
        
        # Get unique groups count
        groups_query = select(sql_func.count(sql_func.distinct(Product.group)))
        groups_count = db.execute(groups_query).scalar() or 0
        
        return {
            "total_products": total_products,
            "total_downloads": total_downloads,
            "total_views": total_views,
            "total_groups": groups_count,
            "by_subject": subjects_stats,
            "by_type": types_stats
        }
        
    except Exception as e:
        logger.error(f"Error getting products stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")
