# Pydantic 模型，用于输入数据验证
from typing import Any, Dict, List
from pydantic import BaseModel


class TestFunctionCode(BaseModel):
    username: str
    node_id: str
    code: str
    name: str
    pip: dict = {}
    image_url: str = ""
    global_variables: dict
    send_save_image: str = ""
    docker_image_use: str = ""


class TestConditionNode(BaseModel):
    username: str
    node_id: str
    name: str
    conditions: dict
    global_variables: dict


class Workflow(BaseModel):
    username: str
    nodes: list
    edges: list
    start_node: str
    global_variables: dict
    debug_resume_task_id: str = ""
    breakpoints: list = []
    input_resume_task_id: str = ""
    user_message: str = ""
    parent_id: str = ""
    temp_db_id: str = ""
    chatflow_id: str = ""
    docker_image_use: str = ""
    need_save_image: str = ""


class WorkflowCreate(BaseModel):
    username: str
    workflow_id: str
    workflow_name: str
    workflow_config: dict
    start_node: str
    global_variables: dict
    nodes: list
    edges: list


class WorkflowRenameInput(BaseModel):
    workflow_id: str
    workflow_new_name: str


class NodesInput(BaseModel):
    username: str
    custom_node_name: str
    custom_node: dict = None


class LLMInputOnce(BaseModel):
    username: str
    user_message: str
    llm_model_config: dict
    system_prompt: str
    mcp_use: dict
    global_variables: dict


class UserMessage(BaseModel):
    conversation_id: str
    parent_id: str
    user_message: str
    temp_db_id: str


class GetTools(BaseModel):
    username: str
    mcp_url: str
    mcp_headers: dict
    mcp_timeout: float
    mcp_sse_read_timeout: float

