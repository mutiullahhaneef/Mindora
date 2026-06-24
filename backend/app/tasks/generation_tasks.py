"""
Generation Celery tasks — for async/long-running generation jobs.
Currently used as an optional async path; routes call generate_service directly.
"""
import asyncio
import logging

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    bind=True,
    max_retries=2,
    name="tasks.async_generate_material",
)
def async_generate_material(
    self,
    document_id: str,
    material_type: str,
    user_id: str,
    **kwargs,
) -> dict:
    """
    Async generation task for offloading heavy AI generation to workers.
    Called optionally for large documents where inline generation may timeout.
    """
    return asyncio.run(
        _async_generate(self, document_id, material_type, user_id, **kwargs)
    )


async def _async_generate(task, document_id: str, material_type: str, user_id: str, **kwargs) -> dict:
    from app.db.session import AsyncSessionLocal
    from app.services.generate_service import GenerateService
    from sqlalchemy import select
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if not user:
                return {"error": "User not found"}

            service = GenerateService(db)

            if material_type == "complete_notes":
                material = await service.generate_notes(document_id, user)
            elif material_type == "bullet_notes":
                material = await service.generate_bullets(document_id, user)
            elif material_type == "cheat_sheet":
                material = await service.generate_cheatsheet(document_id, user)
            else:
                return {"error": f"Unknown material type: {material_type}"}

            return {"material_id": material.id, "status": "done"}

        except Exception as exc:
            logger.exception("Generation task failed: %s", exc)
            raise task.retry(exc=exc, countdown=30)
