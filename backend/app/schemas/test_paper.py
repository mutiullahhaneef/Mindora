"""
TestPaper schemas.
"""
from datetime import datetime
from pydantic import BaseModel


class TestPaperResponse(BaseModel):
    id: str
    document_id: str
    title: str
    mcq_section: list[dict]
    short_qs: list[dict]
    long_qs: list[dict]
    created_at: datetime

    model_config = {"from_attributes": True}
