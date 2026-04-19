from typing import List
from fastapi import APIRouter, Depends, HTTPException
from app.models.chatflow import ChatflowCreate, ChatflowOutput, ChatflowRenameInput, ChatflowSummary
from app.models.user import User
from app.db.mongo import MongoDB, get_mongo
from app.core.security import get_current_user, verify_username_match

router = APIRouter()


# 创建新chatflow
@router.post("/chatflows", response_model=dict)
async def create_chatflow(
    chatflow: ChatflowCreate,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    await verify_username_match(
        current_user, chatflow.chatflow_id.split("_")[0]
    )
    result = await db.create_chatflow(
        chatflow_id=chatflow.chatflow_id,
        username=chatflow.username,
        chatflow_name=chatflow.chatflow_name,
        workflow_id=chatflow.workflow_id,
    )
    return result


# 修改chatflow名称
@router.post("/chatflows/rename", response_model=dict)
async def re_name(
    renameInput: ChatflowRenameInput,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    await verify_username_match(current_user, renameInput.chatflow_id.split("_")[0])

    result = await db.update_chatflow_name(
        renameInput.chatflow_id, renameInput.chatflow_new_name
    )
    if result["status"] == "failed":
        raise HTTPException(status_code=404, detail="Chatflow not found")
    return result


# 获取指定 chatflow_id 的完整chatflow记录
@router.get("/chatflows/{chatflow_id}", response_model=ChatflowOutput)
async def get_chatflow(
    chatflow_id: str,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    await verify_username_match(current_user, chatflow_id.split("_")[0])
    chatflow = await db.get_chatflow(chatflow_id)
    if not chatflow:
        raise HTTPException(status_code=404, detail="Chatflow not found")

    user_files = []
    for turn in chatflow["turns"]:
        user_files.append(await db.get_files_by_knowledge_base_id(turn["temp_db"]))

    return {
        "chatflow_id": chatflow["chatflow_id"],
        "chatflow_name": chatflow["chatflow_name"],
        "workflow_id": chatflow["workflow_id"],
        "username": chatflow["username"],
        "turns": [
            {
                "message_id": turn["message_id"],
                "parent_message_id": turn["parent_message_id"],
                "user_message": turn["user_message"],
                "user_file": user_file,
                "temp_db": turn["temp_db"],
                "ai_message": turn["ai_message"],
                "file_used": turn["file_used"],
                "status": turn["status"],
                "timestamp": turn["timestamp"].isoformat(),
                "total_token": turn["total_token"],
                "completion_tokens": turn["completion_tokens"],
                "prompt_tokens": turn["prompt_tokens"],
            }
            for turn, user_file in zip(chatflow["turns"], user_files)
        ],
        "created_at": chatflow["created_at"].isoformat(),
        "last_modify_at": chatflow["last_modify_at"].isoformat(),
    }


# 查询指定workflow_id的所有chatflow
@router.get("/workflow/{workflow_id}/chatflows", response_model=List[ChatflowSummary])
async def get_chatflows_by_user(
    workflow_id: str,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    await verify_username_match(current_user, workflow_id.split("_")[0])
    chatflows = await db.get_chatflows_by_workflow_id(workflow_id)
    if not chatflows:
        return []
    return [
        {
            "chatflow_id": chatflow["chatflow_id"],
            "chatflow_name": chatflow["chatflow_name"],
            "is_read": chatflow["is_read"],
            "created_at": chatflow["created_at"].isoformat(),
            "last_modify_at": chatflow["last_modify_at"].isoformat(),
        }
        for chatflow in chatflows
    ]


# 删除指定chatflow
@router.delete("/chatflows/{chatflow_id}", response_model=dict)
async def delete_chatflow(
    chatflow_id: str,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    await verify_username_match(current_user, chatflow_id.split("_")[0])
    result = await db.delete_chatflow(chatflow_id)
    if result["status"] == "failed":
        raise HTTPException(status_code=404, detail=result["message"])
    return result


# 删除指定workflow的所有chatflow
@router.delete("/users/{workflow_id}/chatflows", response_model=dict)
async def delete_all_chatflows_by_user(
    workflow_id: str,
    db: MongoDB = Depends(get_mongo),
    current_user: User = Depends(get_current_user),
):
    # 验证当前用户是否与要删除的用户名匹配
    await verify_username_match(current_user, workflow_id.split("_")[0])

    # 执行批量删除
    result = await db.delete_workflow_all_chatflow(workflow_id)

    # 检查删除结果并返回响应
    """if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="No chatflows found for this user or already deleted",
        )"""

    return result
