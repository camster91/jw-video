"""Category endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db import get_db
from scraper.models import Category, Video

router = APIRouter()


@router.get("/categories")
def list_categories(db: Session = Depends(get_db)):
    """List all video categories as a tree."""
    categories = db.query(Category).order_by(Category.sort_order, Category.name).all()
    return {
        "categories": [
            {
                "key": c.key,
                "name": c.name,
                "slug": c.slug,
                "parentKey": c.parent_key,
                "type": c.type,
                "description": c.description,
                "imageUrl": c.image_url,
                "squareImageUrl": c.square_image_url,
                "videoCount": db.query(func.count(Video.id)).filter(Video.category_key == c.key).scalar(),
            }
            for c in categories
        ]
    }


@router.get("/categories/{category_key}")
def get_category(category_key: str, db: Session = Depends(get_db)):
    """Get a single category with its subcategories."""
    cat = db.query(Category).filter(Category.key == category_key).first_or_404()
    children = db.query(Category).filter(Category.parent_key == cat.key).order_by(Category.sort_order, Category.name).all()
    video_count = db.query(func.count(Video.id)).filter(Video.category_key == cat.key).scalar()

    return {
        "key": cat.key,
        "name": cat.name,
        "slug": cat.slug,
        "parentKey": cat.parent_key,
        "type": cat.type,
        "description": cat.description,
        "imageUrl": cat.image_url,
        "squareImageUrl": cat.square_image_url,
        "videoCount": video_count,
        "subcategories": [
            {
                "key": c.key,
                "name": c.name,
                "slug": c.slug,
                "type": c.type,
                "imageUrl": c.image_url,
                "videoCount": db.query(func.count(Video.id)).filter(Video.category_key == c.key).scalar(),
            }
            for c in children
        ],
    }