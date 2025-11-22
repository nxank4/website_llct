"""
Products API endpoints
"""

from typing import List, Optional, cast
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func as sql_func, desc, delete

from ....models.product import Product, ProductType
from ....schemas.product import ProductCreate, ProductUpdate, ProductResponse
from ....core.database import get_db_session_write, get_db_session_read
from ....middleware.auth import AuthenticatedUser, get_current_supervisor_user

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
    db: AsyncSession = Depends(get_db_session_read),
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

        result = await db.execute(query)
        products = result.scalars().all()

        logger.info(f"Retrieved {len(products)} products")
        return [ProductResponse.model_validate(product) for product in products]

    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving products: {str(e)}"
        )


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: int, db: AsyncSession = Depends(get_db_session_read)):
    """Get a specific product by ID"""
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        return ProductResponse.model_validate(product)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Error retrieving product: {str(e)}"
        )


@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
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
            thumbnail_url=product_data.thumbnail_url,
            content_html=product_data.content_html,
            downloads=0,
            views=0,
            submitted_date=datetime.utcnow(),
        )

        db.add(product)
        await db.commit()
        await db.refresh(product)
        logger.info(f"Product created successfully: {product.id}")

        return ProductResponse.model_validate(product)

    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Update an existing product"""
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        update_data = product_data.dict(exclude_unset=True)
        if update_data:
            for field, value in update_data.items():
                setattr(product, field, value)

            await db.commit()
            await db.refresh(product)
            logger.info(f"Product updated successfully: {product_id}")

        return ProductResponse.model_validate(product)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")


@router.delete("/{product_id}")
async def delete_product(
    product_id: int,
    current_user: AuthenticatedUser = Depends(get_current_supervisor_user),
    db: AsyncSession = Depends(get_db_session_write),
):
    """Delete a product"""
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        await db.execute(delete(Product).where(Product.id == product_id))
        await db.commit()
        logger.info(f"Product deleted successfully: {product_id}")

        return {"message": "Product deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")


@router.post("/{product_id}/view")
async def increment_product_views(
    product_id: int, db: AsyncSession = Depends(get_db_session_write)
):
    """Increment view count for a product"""
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        current_views = cast(Optional[int], getattr(product, "views", None))
        setattr(product, "views", (current_views or 0) + 1)  # type: ignore[arg-type]
        await db.commit()
        await db.refresh(product)

        return {"message": "View count incremented", "views": product.views}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing views for product {product_id}: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error incrementing views: {str(e)}"
        )


@router.post("/{product_id}/download")
async def increment_product_downloads(
    product_id: int, db: AsyncSession = Depends(get_db_session_write)
):
    """Increment download count for a product"""
    try:
        result = await db.execute(select(Product).where(Product.id == product_id))
        product = result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        current_downloads = cast(Optional[int], getattr(product, "downloads", None))
        setattr(product, "downloads", (current_downloads or 0) + 1)  # type: ignore[arg-type]
        await db.commit()
        await db.refresh(product)

        return {"message": "Download count incremented", "downloads": product.downloads}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing downloads for product {product_id}: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=500, detail=f"Error incrementing downloads: {str(e)}"
        )


@router.get("/stats/summary")
async def get_products_stats(db: AsyncSession = Depends(get_db_session_read)):
    """Get summary statistics for products"""
    try:
        # Get total count
        result_total = await db.execute(select(sql_func.count(Product.id)))
        total_products = result_total.scalar() or 0

        # Get count by subject
        subjects_query = (
            select(
                Product.subject,
                Product.subject_name,
                sql_func.count(Product.id).label("count"),
            )
            .group_by(Product.subject, Product.subject_name)
            .order_by(desc("count"))
        )
        result_subjects = await db.execute(subjects_query)
        subjects_result = result_subjects.all()
        subjects_stats = [
            {"_id": row.subject, "count": row.count, "subject_name": row.subject_name}
            for row in subjects_result
        ]
        unique_subjects = {
            row.subject
            for row in subjects_result
            if getattr(row, "subject", None)
        }
        total_subjects = len(unique_subjects)

        # Get count by type
        types_query = (
            select(Product.type, sql_func.count(Product.id).label("count"))
            .group_by(Product.type)
            .order_by(desc("count"))
        )
        result_types = await db.execute(types_query)
        types_result = result_types.all()
        types_stats = [{"_id": row.type, "count": row.count} for row in types_result]

        # Get total downloads and views
        totals_query = select(
            sql_func.sum(Product.downloads).label("total_downloads"),
            sql_func.sum(Product.views).label("total_views"),
        )
        result_totals = await db.execute(totals_query)
        totals_result = result_totals.first()
        total_downloads = 0
        total_views = 0
        if totals_result:
            total_downloads = totals_result.total_downloads or 0  # type: ignore[attr-defined]
            total_views = totals_result.total_views or 0  # type: ignore[attr-defined]

        # Get unique groups count
        groups_query = select(sql_func.count(sql_func.distinct(Product.group)))
        result_groups = await db.execute(groups_query)
        groups_count = result_groups.scalar() or 0

        return {
            "total_products": total_products,
            "total_downloads": total_downloads,
            "total_views": total_views,
            "total_groups": groups_count,
            "total_subjects": total_subjects,
            "by_subject": subjects_stats,
            "by_type": types_stats,
        }

    except Exception as e:
        logger.error(f"Error getting products stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving stats: {str(e)}")
