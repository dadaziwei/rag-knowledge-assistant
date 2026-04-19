import base64
from io import BytesIO
import hashlib
import json
import httpx
from typing import Literal, Optional, List, Union, Tuple
from app.core.config import settings
from app.core.logging import logger


# from tenacity import retry, stop_after_attempt, wait_exponential
# @retry(
#     stop=stop_after_attempt(3),
#     wait=wait_exponential(multiplier=1, min=4, max=10)
# )
async def get_embeddings_from_httpx(
    data: Union[
        List[str],  # 文本输入
        List[BytesIO],  # 原始图片输入
        List[Tuple[str, Tuple[str, BytesIO, str]]],  # 本地图片请求格式
    ],
    endpoint: Literal["embed_text", "embed_image"],
    embedding_model: Literal[
        "local_colqwen", "jina_embeddings_v4"
    ] = settings.embedding_model,
    jina_api_key: Optional[str] = settings.jina_api_key,
    jina_task: Optional[str] = None,
) -> List[List[float]]:
    """
    获取嵌入向量，支持本地模型服务和Jina Embeddings V4 API

    Args:
        data: 输入数据 - 文本时为list[str]，图片时为list[BytesIO]或本地请求格式
        endpoint: 端点类型（embed_text/embed_image）
        embedding_method: 嵌入方法（local_colqwen/jina_embeddings_v4）
        jina_api_key: Jina API密钥（使用Jina时必需）
        jina_task: 覆盖默认的Jina任务类型（可选）
    """
    try:
        if embedding_model == "jina_embeddings_v4":
            return await _get_jina_embeddings(
                data=data,
                endpoint=endpoint,
                api_key=jina_api_key,
                task_override=jina_task,
            )
        else:
            return await _get_local_embeddings(data=data, endpoint=endpoint)
    except Exception as e:
        logger.error(f"Embedding request failed: {str(e)}")
        raise


async def _get_local_embeddings(
    data: Union[
        List[str],  # 文本输入
        List[BytesIO],  # 原始图片输入
        List[Tuple[str, Tuple[str, BytesIO, str]]],  # 本地图片请求格式
    ],
    endpoint: Literal["embed_text", "embed_image"],
) -> List[List[float]]:
    """从本地模型服务获取嵌入向量"""
    logger.info(
        f"Requesting local embeddings | Endpoint: {endpoint} | Items: {len(data)}"
    )

    try:
        async with httpx.AsyncClient(trust_env=False) as client:
            if endpoint == "embed_text":
                # 确保输入是文本列表
                if not all(isinstance(item, str) for item in data):
                    error_msg = "All data items must be strings for text embedding"
                    logger.error(error_msg)
                    raise TypeError(error_msg)

                response = await client.post(
                    f"http://model-server:8005/{endpoint}",
                    json={"queries": data},
                    timeout=1200.0,
                )
            else:
                # 处理不同的图片输入格式
                if isinstance(data[0], tuple):
                    files = data
                elif isinstance(data[0], BytesIO):
                    files = []
                    for i, img_io in enumerate(data):
                        img_io.seek(0)  # 重置读取位置
                        files.append(
                            ("images", (f"image_{i}.png", img_io, "image/png"))
                        )
                else:
                    error_msg = "Image data must be BytesIO objects or request tuples"
                    logger.error(error_msg)
                    raise TypeError(error_msg)

                response = await client.post(
                    f"http://model-server:8005/{endpoint}", files=files, timeout=1200.0
                )

            response.raise_for_status()
            logger.info(
                f"Successfully processed embeddings from local embedding model"
            )
            return response.json()["embeddings"]

    except httpx.HTTPStatusError as e:
        error_detail = f"Local embedding model request failed: {e.response.text}"
        logger.error(f"{error_detail} | Status: {e.response.status_code}")
        raise Exception(error_detail)
    except json.JSONDecodeError as e:
        error_detail = f"Local embedding model response parsing failed: {e}"
        logger.error(error_detail)
        raise Exception(error_detail)
    except Exception as e:
        if settings.embedding_fallback_enabled:
            logger.warning(
                f"Local embedding model unavailable, using deterministic fallback embeddings: {str(e)}"
            )
            return _get_fallback_embeddings(data=data, endpoint=endpoint)
        logger.error(f"Unexpected error in local embedding embeddings: {str(e)}")
        raise


def _hash_to_vector(seed: bytes, dim: int = 128) -> List[float]:
    values = []
    counter = 0
    while len(values) < dim:
        digest = hashlib.sha256(seed + counter.to_bytes(4, "big")).digest()
        values.extend([(byte / 127.5) - 1.0 for byte in digest])
        counter += 1
    vector = values[:dim]
    norm = sum(v * v for v in vector) ** 0.5 or 1.0
    return [v / norm for v in vector]


def _get_fallback_embeddings(
    data: Union[
        List[str],
        List[BytesIO],
        List[Tuple[str, Tuple[str, BytesIO, str]]],
    ],
    endpoint: Literal["embed_text", "embed_image"],
) -> List[List[List[float]]]:
    embeddings = []
    for index, item in enumerate(data):
        if endpoint == "embed_text":
            seed = str(item).encode("utf-8", errors="ignore")
        elif isinstance(item, tuple):
            _, (filename, img_io, _) = item
            img_io.seek(0)
            seed = filename.encode("utf-8", errors="ignore") + img_io.read()
            img_io.seek(0)
        elif isinstance(item, BytesIO):
            item.seek(0)
            seed = item.read()
            item.seek(0)
        else:
            seed = repr(item).encode("utf-8", errors="ignore")

        token_vectors = [
            _hash_to_vector(seed + f":{index}:{token_index}".encode("ascii"))
            for token_index in range(16)
        ]
        embeddings.append(token_vectors)
    return embeddings


async def _get_jina_embeddings(
    data: Union[
        List[str],  # 文本输入
        List[BytesIO],  # 原始图片输入
        List[Tuple[str, Tuple[str, BytesIO, str]]],  # 本地图片请求格式
    ],
    endpoint: Literal["embed_text", "embed_image"],
    api_key: str,
    task_override: Optional[str] = None,
) -> List[List[float]]:
    """从Jina Embeddings V4 API获取嵌入向量"""

    if not api_key:
        error_msg = "API key is required for Jina embeddings"
        logger.error(error_msg)
        raise ValueError(error_msg)

    # 设置默认任务类型
    task_mapping = {"embed_text": "retrieval.query", "embed_image": "retrieval.passage"}
    task = task_override or task_mapping[endpoint]

    # 准备请求头
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {api_key}"}

    # 构建请求体
    payload = {"model": "jina-embeddings-v4", "task": task, "return_multivector": True}

    # 根据端点类型处理输入数据
    if endpoint == "embed_text":
        # 验证文本输入
        if not all(isinstance(item, str) for item in data):
            error_msg = "All data items must be strings for text embedding"
            raise TypeError(error_msg)
        payload["input"] = [{"text": text} for text in data]

    elif endpoint == "embed_image":
        # 处理不同的图片输入格式
        image_data = []

        if isinstance(data[0], tuple):
            # 从本地请求格式中提取BytesIO对象
            for field_name, (filename, img_io, content_type) in data:
                img_io.seek(0)  # 重置读取位置
                base64_image = base64.b64encode(img_io.read()).decode("utf-8")
                image_data.append({"image": base64_image})

        elif isinstance(data[0], BytesIO):
            # 直接处理BytesIO对象
            for img_io in data:
                img_io.seek(0)  # 重置读取位置
                base64_image = base64.b64encode(img_io.read()).decode("utf-8")
                image_data.append({"image": base64_image})

        else:
            error_msg = "Image data must be BytesIO objects or request tuples"
            logger.error(error_msg)
            raise TypeError(error_msg)

        payload["input"] = image_data

    # 发送API请求
    async with httpx.AsyncClient() as client:
        try:
            logger.info(
                f"Sending request to Jina API | URL: {settings.jina_embeddings_v4_url} | Embedding Type: {endpoint}"
            )
            response = await client.post(
                settings.jina_embeddings_v4_url,
                headers=headers,
                json=payload,
                timeout=600.0,  # Jina API通常响应更快
            )
            response.raise_for_status()
            result = response.json()

            # 合并多向量结果
            embeddings = []
            for item in result["data"]:
                embeddings.append(item["embeddings"])

            logger.info(
                f"Successfully processed {len(embeddings)} embeddings from Jina ｜ total_tokens usage: {result['usage']['total_tokens']},"
            )
            return embeddings

        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if e.response else str(e)
            logger.error(
                f"Jina API request failed | Status: {e.response.status_code} | Error: {error_detail}"
            )
            raise Exception(f"Jina API request failed: {error_detail}")
        except json.JSONDecodeError as e:
            logger.error(f"Jina API response parsing failed: {e}")
            raise Exception(f"Jina API response parsing failed: {e}")
        except Exception as e:
            logger.error(f"Unexpected error in Jina embeddings: {str(e)}")
            raise
