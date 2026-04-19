from typing import Any, Dict, List

from app.db.milvus import milvus_client
from app.rag.get_embedding import get_embeddings_from_httpx


class MetadataAwareRetriever:
    """Small LangChain-compatible retriever facade for metadata-filtered RAG."""

    def __init__(self, collection_names: List[str], metadata_filter: Dict[str, Any]):
        self.collection_names = collection_names
        self.metadata_filter = metadata_filter

    async def ainvoke(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_embedding = await get_embeddings_from_httpx([query], endpoint="embed_text")
        hits: List[Dict[str, Any]] = []
        for collection_name in self.collection_names:
            if not milvus_client.check_collection(collection_name):
                continue
            scores = milvus_client.search(
                collection_name=collection_name,
                data=query_embedding[0],
                topk=top_k,
                metadata_filter=self.metadata_filter,
            )
            for score in scores:
                score["collection_name"] = collection_name
            hits.extend(scores)
        return sorted(hits, key=lambda item: item["score"], reverse=True)[:top_k]


def build_langchain_messages(question: str, contexts: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    context_text = "\n".join(
        [
            f"- file_id={item.get('file_id')} page={item.get('page_number')} score={item.get('score')}"
            for item in contexts
        ]
    )
    return [
        {
            "role": "system",
            "content": "你是企业知识库问答助手。请只基于召回内容回答，无法确认时说明依据不足。",
        },
        {
            "role": "user",
            "content": f"召回内容:\n{context_text}\n\n问题:\n{question}",
        },
    ]
