"""
MCQ schemas.
"""
from datetime import datetime
from pydantic import BaseModel


class MCQResponse(BaseModel):
    id: str
    material_id: str
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: str | None = None
    order_index: int

    model_config = {"from_attributes": True}


class MCQSetResponse(BaseModel):
    material_id: str
    document_id: str
    created_at: datetime
    mcqs: list[MCQResponse]
