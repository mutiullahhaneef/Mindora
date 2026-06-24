"""
Central API v1 router — registers all sub-routers under /api/v1
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.generate import router as generate_router
from app.api.v1.materials import router as materials_router
from app.api.v1.chat import router as chat_router
from app.api.v1.gamification import router as gamification_router
from app.api.v1.study import router as study_router
from app.api.v1.research import router as research_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(documents_router)
api_v1_router.include_router(generate_router)
api_v1_router.include_router(materials_router)
api_v1_router.include_router(chat_router)
api_v1_router.include_router(gamification_router)
api_v1_router.include_router(study_router)
api_v1_router.include_router(research_router)



