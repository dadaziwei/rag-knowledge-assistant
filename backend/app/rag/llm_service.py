# services/chat_service.py
import asyncio
import json
from typing import AsyncGenerator
from app.db.mongo import get_mongo
from app.db.miniodb import async_minio_manager
from app.models.conversation import UserMessage
from openai import AsyncOpenAI

from app.rag.mesage import find_depth_parent_mesage
from app.core.logging import logger
from app.db.milvus import milvus_client
from app.rag.convert_file import extract_text_from_file
from app.rag.get_embedding import get_embeddings_from_httpx
from app.rag.utils import replace_image_content, sort_and_filter


def _normalize_score_threshold(score_threshold):
    if score_threshold == -1:
        return None
    if score_threshold < 0:
        return 0
    if score_threshold > 20:
        return 20
    return score_threshold


def _model_accepts_images(model_name: str, model_url: str) -> bool:
    model_identity = f"{model_name} {model_url}".lower()
    text_only_markers = ("deepseek",)
    return not any(marker in model_identity for marker in text_only_markers)


def _message_content_to_text(content) -> str:
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return str(content)

    text_parts = []
    for item in content:
        if isinstance(item, dict) and item.get("type") == "text":
            text_parts.append(item.get("text", ""))
        elif isinstance(item, dict) and item.get("type") == "image_url":
            text_parts.append("[图片内容已省略，当前模型仅支持文本输入]")
    return "\n".join(part for part in text_parts if part)


def _messages_to_text_only(messages):
    return [
        {
            **message,
            "content": _message_content_to_text(message.get("content", "")),
        }
        for message in messages
    ]


def _format_knowledge_context(retrieved_contexts: list[dict]) -> str:
    if not retrieved_contexts:
        return ""

    blocks = ["以下是从已选择知识库召回的内容，请优先基于这些内容回答："]
    for index, item in enumerate(retrieved_contexts, start=1):
        page = item.get("page_number")
        page_label = f"第 {page + 1} 页" if isinstance(page, int) else "命中页"
        text = item.get("text") or "该命中文档暂时无法抽取文本，只能作为文件/页码引用。"
        blocks.append(
            "\n".join(
                [
                    f"[{index}] 文件：{item.get('file_name', '')}，{page_label}，分数：{item.get('score'):.4f}",
                    text,
                ]
            )
        )
    return "\n\n".join(blocks)


def _trim_excerpt(text: str, limit: int = 180) -> str:
    normalized = " ".join((text or "").split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: limit - 1].rstrip() + "…"


def _build_citations(retrieved_contexts: list[dict], file_used: list[dict]) -> list[dict]:
    citations = []
    for file_item, context_item in zip(file_used, retrieved_contexts):
        citations.append(
            {
                "knowledge_db_id": file_item.get("knowledge_db_id"),
                "file_name": file_item.get("file_name"),
                "file_url": file_item.get("file_url"),
                "image_url": file_item.get("image_url"),
                "page_number": file_item.get("page_number"),
                "score": file_item.get("score"),
                "excerpt": _trim_excerpt(context_item.get("text", "")),
            }
        )
    return citations


async def _load_file_text_context(file_info: dict, text_cache: dict[str, str]) -> str:
    minio_filename = file_info.get("file_minio_filename")
    file_name = file_info.get("file_name")
    if not minio_filename:
        return ""
    if minio_filename in text_cache:
        return text_cache[minio_filename]

    try:
        file_content = await async_minio_manager.get_file_from_minio(minio_filename)
        text = extract_text_from_file(file_content, file_name=file_name)
    except Exception as e:
        logger.warning(
            f"Unable to extract text context from retrieved file {file_name}: {str(e)}"
        )
        text = ""

    text_cache[minio_filename] = text
    return text


class ChatService:

    @staticmethod
    async def create_chat_stream(
        user_message_content: UserMessage, message_id: str
    ) -> AsyncGenerator[str, None]:
        """创建聊天流并处理存储逻辑"""
        db = await get_mongo()

        # 获取system prompt
        model_config = await db.get_conversation_model_config(
            user_message_content.conversation_id
        )

        model_name = model_config["model_name"]
        model_url = model_config["model_url"]
        api_key = model_config["api_key"]
        base_used = model_config["base_used"]

        system_prompt = model_config["system_prompt"]
        if len(system_prompt) > 1048576:
            system_prompt = system_prompt[0:1048576]

        temperature = model_config["temperature"]
        if temperature < 0 and not temperature == -1:
            temperature = 0
        elif temperature > 1:
            temperature = 1
        else:
            pass

        max_length = model_config["max_length"]
        if max_length < 1024 and not max_length == -1:
            max_length = 1024
        elif max_length > 1048576:
            max_length = 1048576
        else:
            pass

        top_P = model_config["top_P"]
        if top_P < 0 and not top_P == -1:
            top_P = 0
        elif top_P > 1:
            top_P = 1
        else:
            pass

        top_K = model_config["top_K"]
        if top_K == -1:
            top_K = 3
        elif top_K < 1:
            top_K = 1
        elif top_K > 30:
            top_K = 30
        else:
            pass

        score_threshold = _normalize_score_threshold(model_config["score_threshold"])
        model_accepts_images = _model_accepts_images(model_name, model_url)

        if not system_prompt:
            messages = []
        else:
            messages = [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            # "text": "You are DaziKnow, developed by Li Wei(daziwei), a multimodal RAG tool built on ColQwen and Qwen2.5-VL-72B. The retrieval process relies entirely on vision, enabling accurate recognition of tables, images, and documents in various formats. All outputs in Markdown format.",
                            "text": system_prompt,
                        }
                    ],
                }
            ]
            logger.info(
                f"chat '{user_message_content.conversation_id} uses system prompt {system_prompt}'"
            )

        history_messages = await find_depth_parent_mesage(
            user_message_content.conversation_id,
            user_message_content.parent_id,
            MAX_PARENT_DEPTH=5,
        )

        for i in range(len(history_messages), 0, -1):
            messages.append(history_messages[i - 1])

        # 处理用户上传的文件
        content = []
        bases = []
        request_username = user_message_content.conversation_id.split("_")[0]
        metadata_filter = {"owner_username": request_username}
        if user_message_content.temp_db:
            bases.append({"baseId": user_message_content.temp_db})

        # 搜索知识库匹配内容

        bases.extend(base_used)
        file_used = []
        retrieved_contexts = []
        citations = []
        text_cache = {}
        if bases:
            result_score = []
            query_embedding = await get_embeddings_from_httpx(
                [user_message_content.user_message], endpoint="embed_text"
            )
            for base in bases:
                collection_name = f"colqwen{base['baseId'].replace('-', '_')}"
                if milvus_client.check_collection(collection_name):
                    scores = milvus_client.search(
                        collection_name,
                        data=query_embedding[0],
                        topk=top_K,
                        metadata_filter=metadata_filter,
                    )
                    for score in scores:
                        score.update({"collection_name": collection_name})
                    result_score.extend(scores)
            sorted_score = sort_and_filter(result_score, min_score=score_threshold)
            logger.info(
                "RAG retrieval completed | "
                f"conversation={user_message_content.conversation_id} "
                f"bases={len(bases)} raw_hits={len(result_score)} "
                f"filtered_hits={len(sorted_score)} threshold={score_threshold}"
            )
            if len(sorted_score) >= top_K:
                cut_score = sorted_score[:top_K]
            else:
                cut_score = sorted_score

            # 获取minio name并转成base64
            for score in cut_score:
                """
                根据 file_id 和 image_id 获取：
                - knowledge_db_id
                - filename
                - 文件的 minio_filename 和 minio_url
                - 图片的 minio_filename 和 minio_url
                """
                file_and_image_info = await db.get_file_and_image_info(
                    score["file_id"], score["image_id"]
                )
                if not file_and_image_info["status"] == "success":
                    milvus_client.delete_files(
                        score["collection_name"], [score["file_id"]]
                    )
                    logger.warning(
                        f"file_id: {score['file_id']} not found or corresponding image does not exist; deleting Milvus vectors"
                    )
                else:
                    file_used.append(
                        {
                            "score": score["score"],
                            "knowledge_db_id": file_and_image_info["knowledge_db_id"],
                            "file_name": file_and_image_info["file_name"],
                            "image_url": file_and_image_info["image_minio_url"],
                            "file_url": file_and_image_info["file_minio_url"],
                            "page_number": score["page_number"],
                        }
                    )
                    text_context = await _load_file_text_context(
                        file_and_image_info, text_cache
                    )
                    retrieved_contexts.append(
                        {
                            "score": score["score"],
                            "file_name": file_and_image_info["file_name"],
                            "page_number": score["page_number"],
                            "text": text_context,
                        }
                    )
                    if model_accepts_images:
                        content.append(
                            {
                                "type": "image_url",
                                "image_url": file_and_image_info["image_minio_filename"],
                            }
                        )

        knowledge_context = _format_knowledge_context(retrieved_contexts)
        citations = _build_citations(retrieved_contexts, file_used)
        if knowledge_context:
            content.append({"type": "text", "text": knowledge_context})

        # 用户输入
        content.append(
            {
                "type": "text",
                "text": user_message_content.user_message,
            },
        )

        user_message = {
            "role": "user",
            "content": content,
        }
        messages.append(user_message)
        if model_accepts_images:
            send_messages = await replace_image_content(messages)
        else:
            send_messages = _messages_to_text_only(messages)

        is_aborted = False  # 标记是否中断
        thinking_content = []
        full_response = []
        total_token = 0
        completion_tokens = 0
        prompt_tokens = 0
        try:
            client = AsyncOpenAI(
                # 若没有配置环境变量，请用百炼API Key将下行替换为：api_key="sk-xxx",
                api_key=api_key,
                base_url=model_url,
            )

            # 调用OpenAI API
            # 动态构建参数字典
            optional_args = {}
            if temperature != -1:
                optional_args["temperature"] = temperature
            if max_length != -1:
                optional_args["max_tokens"] = (
                    max_length  # 注意官方API参数名为max_tokens
                )
            if top_P != -1:
                optional_args["top_p"] = top_P  # 注意官方API参数名为top_p（小写p）

            # 带条件参数的API调用
            response = await client.chat.completions.create(
                model=model_name,
                messages=send_messages,
                stream=True,
                stream_options={"include_usage": True},
                **optional_args,  # 展开条件参数
            )

            file_used_payload = json.dumps(
                {
                    "type": "file_used",
                    "data": file_used,  # 这里直接使用已构建的 file_used 列表
                    "message_id": message_id,
                    "model_name": model_name,
                }
            )
            yield f"data: {file_used_payload}\n\n"

            citations_payload = json.dumps(
                {
                    "type": "citations",
                    "data": citations,
                    "message_id": message_id,
                }
            )
            yield f"data: {citations_payload}\n\n"

            # 处理流响应
            async for chunk in response:  # 直接迭代异步生成器
                if chunk.choices:
                    delta = chunk.choices[0].delta
                    # 思考
                    if (
                        hasattr(delta, "reasoning_content")
                        and delta.reasoning_content != None
                    ):
                        if not thinking_content:
                            thinking_content.append("<think>")
                        # 用JSON封装内容，自动处理换行符等特殊字符
                        payload = json.dumps(
                            {
                                "type": "thinking",
                                "data": delta.reasoning_content,
                                "message_id": message_id,
                            }
                        )
                        thinking_content.append(delta.reasoning_content)
                        yield f"data: {payload}\n\n"  # 保持SSE事件标准分隔符
                    # 回答
                    content = delta.content if delta else None
                    if content:
                        if not full_response and thinking_content:
                            thinking_content.append("</think>")
                            full_response.extend(thinking_content)
                        # 用JSON封装内容，自动处理换行符等特殊字符
                        payload = json.dumps(
                            {"type": "text", "data": content, "message_id": message_id}
                        )
                        full_response.append(content)
                        yield f"data: {payload}\n\n"  # 保持SSE事件标准分隔符
                else:
                    # token消耗
                    if hasattr(chunk, "usage") and chunk.usage != None:
                        total_token = chunk.usage.total_tokens
                        completion_tokens = chunk.usage.completion_tokens
                        prompt_tokens = chunk.usage.prompt_tokens
                        # 用JSON封装内容，自动处理换行符等特殊字符
                        payload = json.dumps(
                            {
                                "type": "token",
                                "total_token": total_token,
                                "completion_tokens": completion_tokens,
                                "prompt_tokens": prompt_tokens,
                                "message_id": message_id,
                            }
                        )
                        yield f"data: {payload}\n\n"  # 保持SSE事件标准分隔符
        except asyncio.CancelledError as e:
            logger.info("Request was cancelled by client")
            # 标记为中断状态
            is_aborted = True
            # 构建中断提示信息
            if not full_response and thinking_content:
                full_response.extend(thinking_content)
            full_response.append(" ⚠️ Abort By User")
            raise e  # 重新抛出异常以便上层处理
        except Exception as e:
            logger.error(f"Error during OpenAI API call: {str(e)}")
            # 构建错误提示信息
            if not full_response and thinking_content:
                full_response.extend(thinking_content)
            full_response.append(
                f"""⚠️ **Error occurred**:
 ```LLM_Error
{str(e)}
 ```"""
            )
            raise e  # 重新抛出异常以便上层处理
        finally:
            logger.info(
                f"Closing OpenAI client for conversation {user_message_content.conversation_id}"
            )
            await client.close()

            # 只有在有响应内容时才保存
            if not full_response:
                full_response.append(
                    f"""⚠️ **Error occurred**:
 ```LLM_Error
 No message received from AI
 ```"""
                )
            ai_message = {
                "role": "assistant",
                "content": "".join(full_response),
                "citations": citations,
            }

            # 保存AI响应到mongodb
            asyncio.create_task(
                db.add_turn(
                    conversation_id=user_message_content.conversation_id,
                    message_id=message_id,
                    parent_message_id=user_message_content.parent_id,
                    user_message=user_message,
                    temp_db=user_message_content.temp_db,
                    ai_message=ai_message,
                    file_used=file_used,
                    status="aborted" if is_aborted else "completed",
                    total_token=total_token,
                    completion_tokens=completion_tokens,
                    prompt_tokens=prompt_tokens,
                )
            )
            logger.info(
                f"Save conversation {user_message_content.conversation_id} to mongodb"
            )
