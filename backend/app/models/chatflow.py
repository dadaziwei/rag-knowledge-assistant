# Pydantic 模型，用于输入数据验证
from typing import List
from pydantic import BaseModel


class ChatflowCreate(BaseModel):
    chatflow_id: str
    username: str
    chatflow_name: str
    workflow_id:str


class ChatflowRenameInput(BaseModel):
    chatflow_id: str
    chatflow_new_name: str


class TurnOutput(BaseModel):
    message_id: str
    parent_message_id: str
    user_message: dict
    temp_db: str
    ai_message: dict
    file_used: list
    user_file: list
    status: str
    timestamp: str
    total_token: int
    completion_tokens: int
    prompt_tokens: int


class ChatflowOutput(BaseModel):
    chatflow_id: str
    chatflow_name: str
    username: str
    turns: List[TurnOutput]
    created_at: str
    last_modify_at: str


class ChatflowSummary(BaseModel):
    chatflow_id: str
    created_at: str
    chatflow_name: str
    is_read: bool
    last_modify_at: str