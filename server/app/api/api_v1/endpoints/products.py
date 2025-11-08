"""
Products API endpoints for MongoDB
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
import logging

from app.models.mongodb_models import (
    Product, 
    ProductCreate, 
    ProductUpdate, 
    ProductResponse,
    ProductType
)
from app.api.api_v1.endpoints.mongodb_auth import get_current_user
from app.models.mongodb_models import User

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
    limit: int = Query(100, ge=1, le=1000, description="Number of products to return")
):
    """List all products with optional filtering"""
    try:
        # Build filter query
        filter_query = {}
        if subject:
            filter_query["subject"] = subject
        if type:
            filter_query["type"] = type
        if semester:
            filter_query["semester"] = semester
        if group:
            filter_query["group"] = group
        if instructor:
            filter_query["instructor"] = instructor
        
        # Get products from database
        products = await Product.find(filter_query).skip(skip).limit(limit).to_list()
        
        # Convert to response format
        result = []
        for product in products:
            result.append(ProductResponse(
                id=str(product.id),
                title=product.title,
                description=product.description,
                subject=product.subject,
                subject_name=product.subject_name,
                group=product.group,
                members=product.members,
                instructor=product.instructor,
                semester=product.semester,
                type=product.type,
                technologies=product.technologies,
                file_url=product.file_url,
                demo_url=product.demo_url,
                downloads=product.downloads,
                views=product.views,
                submitted_date=product.submitted_date,
                created_at=product.created_at,
                updated_at=product.updated_at
            ))
        
        logger.info(f"Retrieved {len(result)} products with filters: {filter_query}")
        return result
        
    except Exception as e:
        logger.error(f"Error listing products: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving products: {str(e)}")

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    """Get a specific product by ID"""
    try:
        product = await Product.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return ProductResponse(
            id=str(product.id),
            title=product.title,
            description=product.description,
            subject=product.subject,
            subject_name=product.subject_name,
            group=product.group,
            members=product.members,
            instructor=product.instructor,
            semester=product.semester,
            type=product.type,
            technologies=product.technologies,
            file_url=product.file_url,
            demo_url=product.demo_url,
            downloads=product.downloads,
            views=product.views,
            submitted_date=product.submitted_date,
            created_at=product.created_at,
            updated_at=product.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving product: {str(e)}")

@router.post("/", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new product"""
    try:
        logger.info(f"Creating product: {product_data.title}")
        
        # Create new product
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
            submitted_date=datetime.utcnow(),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Save to database
        await product.insert()
        
        logger.info(f"Product created successfully: {product.id}")
        
        return ProductResponse(
            id=str(product.id),
            title=product.title,
            description=product.description,
            subject=product.subject,
            subject_name=product.subject_name,
            group=product.group,
            members=product.members,
            instructor=product.instructor,
            semester=product.semester,
            type=product.type,
            technologies=product.technologies,
            file_url=product.file_url,
            demo_url=product.demo_url,
            downloads=product.downloads,
            views=product.views,
            submitted_date=product.submitted_date,
            created_at=product.created_at,
            updated_at=product.updated_at
        )
        
    except Exception as e:
        logger.error(f"Error creating product: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating product: {str(e)}")

@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: User = Depends(get_current_user)
):
    """Update an existing product"""
    try:
        # Get existing product
        product = await Product.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Update fields that are provided
        update_data = product_data.dict(exclude_unset=True)
        if update_data:
            update_data["updated_at"] = datetime.utcnow()
            
            for field, value in update_data.items():
                setattr(product, field, value)
            
            await product.save()
            logger.info(f"Product updated successfully: {product_id}")
        
        return ProductResponse(
            id=str(product.id),
            title=product.title,
            description=product.description,
            subject=product.subject,
            subject_name=product.subject_name,
            group=product.group,
            members=product.members,
            instructor=product.instructor,
            semester=product.semester,
            type=product.type,
            technologies=product.technologies,
            file_url=product.file_url,
            demo_url=product.demo_url,
            downloads=product.downloads,
            views=product.views,
            submitted_date=product.submitted_date,
            created_at=product.created_at,
            updated_at=product.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating product: {str(e)}")

@router.delete("/{product_id}")
async def delete_product(
    product_id: str,
    current_user: User = Depends(get_current_user)
):
    """Delete a product"""
    try:
        # Get existing product
        product = await Product.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Delete product
        await product.delete()
        logger.info(f"Product deleted successfully: {product_id}")
        
        return {"message": "Product deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting product: {str(e)}")

@router.post("/{product_id}/view")
async def increment_product_views(product_id: str):
    """Increment view count for a product"""
    try:
        product = await Product.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product.views += 1
        product.updated_at = datetime.utcnow()
        await product.save()
        
        return {"message": "View count incremented", "views": product.views}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing views for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error incrementing views: {str(e)}")

@router.post("/{product_id}/download")
async def increment_product_downloads(product_id: str):
    """Increment download count for a product"""
    try:
        product = await Product.get(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        product.downloads += 1
        product.updated_at = datetime.utcnow()
        await product.save()
        
        return {"message": "Download count incremented", "downloads": product.downloads}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error incrementing downloads for product {product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error incrementing downloads: {str(e)}")

@router.get("/stats/summary")
async def get_products_stats():
    """Get summary statistics for products"""
    try:
        # Get total count
        total_products = await Product.count()
        
        # Get count by subject
        subjects_pipeline = [
            {"$group": {"_id": "$subject", "count": {"$sum": 1}, "subject_name": {"$first": "$subject_name"}}},
            {"$sort": {"count": -1}}
        ]
        subjects_stats = await Product.aggregate(subjects_pipeline).to_list()
        
        # Get count by type
        types_pipeline = [
            {"$group": {"_id": "$type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        types_stats = await Product.aggregate(types_pipeline).to_list()
        
        # Get total downloads and views
        totals_pipeline = [
            {"$group": {"_id": None, "total_downloads": {"$sum": "$downloads"}, "total_views": {"$sum": "$views"}}}
        ]
        totals_result = await Product.aggregate(totals_pipeline).to_list()
        total_downloads = totals_result[0]["total_downloads"] if totals_result else 0
        total_views = totals_result[0]["total_views"] if totals_result else 0
        
        # Get unique groups count
        groups_count = len(await Product.distinct("group"))
        
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
