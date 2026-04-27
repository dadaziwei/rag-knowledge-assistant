import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text(encoding="utf-8")


class ResumeRagUpgradeContractTests(unittest.TestCase):
    def test_deepseek_and_port_configuration_are_wired(self):
        env = read(".env.example")
        compose = read("docker-compose.yml")
        compose_no_embedding = read("docker-compose-no-local-embedding.yml")

        self.assertIn("COMPOSE_PROJECT_NAME=rag_knowledge_assistant", env)
        self.assertIn("DEEPSEEK_API_KEY=replace-with-your-deepseek-api-key", env)
        self.assertIn("DEEPSEEK_BASE_URL=https://api.deepseek.com", env)
        self.assertIn("DEEPSEEK_MODEL=deepseek-chat", env)
        self.assertIn("REFRESH_TOKEN_EXPIRE_MINUTES=43200", env)
        self.assertIn("KAFKA_ENABLED=true", env)
        self.assertIn("EMBEDDING_FALLBACK_ENABLED=true", env)
        self.assertIn("WAIT_FOR_UNOSERVER=true", env)
        self.assertIn('"18080:80"', compose)
        self.assertIn('"18080:80"', compose_no_embedding)
        for compose_file in (compose, compose_no_embedding):
            self.assertIn("DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}", compose_file)
            self.assertIn("REFRESH_TOKEN_EXPIRE_MINUTES=${REFRESH_TOKEN_EXPIRE_MINUTES}", compose_file)
            self.assertIn("KAFKA_ENABLED=${KAFKA_ENABLED}", compose_file)
            self.assertIn("HTTP_PROXY=${HTTP_PROXY}", compose_file)
            self.assertIn("NO_PROXY=${NO_PROXY}", compose_file)
            self.assertIn("WAIT_FOR_UNOSERVER=${WAIT_FOR_UNOSERVER}", compose_file)
            self.assertIn("image: apache/kafka:latest", compose_file)
            self.assertIn("KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://kafka:9092", compose_file)

    def test_refresh_token_contract_is_present(self):
        auth_endpoint = read("backend/app/api/endpoints/auth.py")
        security = read("backend/app/core/security.py")
        schemas = read("backend/app/schemas/auth.py")

        self.assertIn('create_refresh_token(', security)
        self.assertIn('decode_refresh_token(', security)
        self.assertIn('"token_type"] = "refresh"', security)
        self.assertIn('token_type != "refresh"', security)
        self.assertIn("class RefreshTokenRequest", schemas)
        self.assertIn("refresh_token: str", schemas)
        self.assertIn('@router.post("/refresh", response_model=TokenSchema)', auth_endpoint)
        self.assertIn('f"refresh:{refresh_token}"', auth_endpoint)
        self.assertIn('f"refresh:{payload.refresh_token}"', auth_endpoint)

    def test_upload_metadata_flows_through_kafka_and_processing(self):
        base_endpoint = read("backend/app/api/endpoints/base.py")
        chat_endpoint = read("backend/app/api/endpoints/chat.py")
        producer = read("backend/app/utils/kafka_producer.py")
        consumer = read("backend/app/utils/kafka_consumer.py")
        rag_utils = read("backend/app/rag/utils.py")

        for endpoint in (base_endpoint, chat_endpoint):
            self.assertIn("tenant_id: str | None = Query(None)", endpoint)
            self.assertIn('"tenant_id": tenant_id or username', endpoint)
            self.assertIn('"owner_username": username', endpoint)
            self.assertIn("metadata=access_metadata", endpoint)

        self.assertIn("metadata: dict | None = None", producer)
        self.assertIn('"metadata": metadata or {}', producer)
        self.assertIn('metadata = message.get("metadata", {})', consumer)
        self.assertIn("metadata=metadata", consumer)
        self.assertIn("async def process_file(redis, task_id, username, knowledge_db_id, file_meta, metadata=None)", rag_utils)
        self.assertIn('metadata.setdefault("tenant_id", username)', rag_utils)
        self.assertIn('"metadata": metadata', rag_utils)

    def test_milvus_filter_and_langchain_adapter_contracts(self):
        milvus = read("backend/app/db/milvus.py")
        llm_service = read("backend/app/rag/llm_service.py")
        adapter = read("backend/app/rag/langchain_adapter.py")
        requirements = read("backend/requirements.txt")

        self.assertIn("def _build_metadata_filter", milvus)
        for key in ("tenant_id", "org_id", "owner_username", "knowledge_db_id"):
            self.assertIn(key, milvus)
        self.assertIn("filter=filter_expr", milvus)
        self.assertIn("**data.get(\"metadata\", {})", milvus)
        self.assertIn('metadata_filter = {"owner_username": request_username}', llm_service)
        self.assertIn("metadata_filter=metadata_filter", llm_service)
        self.assertIn("def _normalize_score_threshold", llm_service)
        self.assertIn("return None", llm_service)
        self.assertIn("RAG retrieval completed", llm_service)
        self.assertIn("class MetadataAwareRetriever", adapter)
        self.assertIn("async def ainvoke", adapter)
        self.assertIn("langchain-core", requirements)

    def test_deepseek_text_only_rag_context_is_supported(self):
        llm_service = read("backend/app/rag/llm_service.py")
        convert_file = read("backend/app/rag/convert_file.py")

        self.assertIn("def _model_accepts_images", llm_service)
        self.assertIn('"deepseek"', llm_service)
        self.assertIn("def _messages_to_text_only", llm_service)
        self.assertIn("以下是从已选择知识库召回的内容", llm_service)
        self.assertIn("extract_text_from_file", llm_service)
        self.assertIn("file_minio_filename", llm_service)
        self.assertIn("def extract_text_from_file", convert_file)
        self.assertIn('"pdftotext"', convert_file)
        self.assertIn("_extract_docx_text(file_content)", convert_file)
        self.assertIn("_extract_plain_text(file_content)", convert_file)

    def test_websocket_route_is_registered_and_streams_json(self):
        api_init = read("backend/app/api/__init__.py")
        ws_chat = read("backend/app/api/endpoints/ws_chat.py")

        self.assertIn("from app.api.endpoints import ws_chat", api_init)
        self.assertIn('api_router.include_router(ws_chat.router, prefix="/ws"', api_init)
        self.assertIn('@router.websocket("/chat")', ws_chat)
        self.assertIn("_authenticate_websocket", ws_chat)
        self.assertIn("_send_stream_chunk", ws_chat)
        self.assertIn("await websocket.send_json", ws_chat)
        self.assertIn("ChatService.create_chat_stream", ws_chat)

    def test_lightweight_demo_fallbacks_are_present(self):
        convert_file = read("backend/app/rag/convert_file.py")
        get_embedding = read("backend/app/rag/get_embedding.py")
        config = read("backend/app/core/config.py")
        milvus = read("backend/app/db/milvus.py")

        self.assertIn('file_extension == "docx"', convert_file)
        self.assertIn('file_extension in {"txt", "md", "markdown"}', convert_file)
        self.assertIn("Unoserver docx conversion failed", convert_file)
        self.assertIn("def _extract_docx_text", convert_file)
        self.assertIn("def _text_to_images", convert_file)
        self.assertIn("embedding_fallback_enabled: bool = True", config)
        self.assertIn("def _get_fallback_embeddings", get_embedding)
        self.assertIn("httpx.AsyncClient(trust_env=False)", get_embedding)
        self.assertIn("Local embedding model unavailable", get_embedding)
        self.assertIn("enable_dynamic_field=True", milvus)
        self.assertIn("ensure_dynamic_collection", milvus)

    def test_answer_citation_contracts_are_present(self):
        llm_service = read("backend/app/rag/llm_service.py")
        chat_page = read("frontend/src/app/[locale]/ai-chat/page.tsx")
        chat_message = read("frontend/src/components/AiChat/ChatMessage.tsx")
        types_file = read("frontend/src/types/types.ts")

        self.assertIn("def _build_citations", llm_service)
        self.assertIn('"type": "citations"', llm_service)
        self.assertIn('"citations": citations', llm_service)
        self.assertIn("citations: item.ai_message.citations || []", chat_page)
        self.assertIn('if (payload.type === "citations")', chat_page)
        self.assertIn("citationsTitle", chat_message)
        self.assertIn("viewEvidence", chat_message)
        self.assertIn("export interface Citation", types_file)
        self.assertIn("citations?: Citation[]", types_file)

    def test_feedback_loop_contracts_are_present(self):
        conversation_model = read("backend/app/models/conversation.py")
        chat_endpoint = read("backend/app/api/endpoints/chat.py")
        mongo = read("backend/app/db/mongo.py")
        chat_api = read("frontend/src/lib/api/chatApi.ts")
        chat_page = read("frontend/src/app/[locale]/ai-chat/page.tsx")
        chat_message = read("frontend/src/components/AiChat/ChatMessage.tsx")
        types_file = read("frontend/src/types/types.ts")

        self.assertIn("class ConversationFeedbackInput", conversation_model)
        self.assertIn('rating: Literal["helpful", "unhelpful"]', conversation_model)
        self.assertIn('/conversations/{conversation_id}/messages/{message_id}/feedback', chat_endpoint)
        self.assertIn("await db.update_turn_feedback(", chat_endpoint)
        self.assertIn("async def update_turn_feedback(", mongo)
        self.assertIn('"turns.$.ai_message.feedback": feedback', mongo)
        self.assertIn("export interface MessageFeedback", types_file)
        self.assertIn("feedback?: MessageFeedback | null", types_file)
        self.assertIn("submitChatFeedback", chat_api)
        self.assertIn("item.ai_message.feedback || null", chat_page)
        self.assertIn("handleSubmitFeedback", chat_page)
        self.assertIn("onSubmitFeedback", chat_message)
        self.assertIn('feedbackRating === "helpful"', chat_message)
        self.assertIn('feedbackRating === "unhelpful"', chat_message)

    def test_feedback_insight_contracts_are_present(self):
        mongo = read("backend/app/db/mongo.py")
        chat_endpoint = read("backend/app/api/endpoints/chat.py")
        chat_api = read("frontend/src/lib/api/chatApi.ts")
        chat_page = read("frontend/src/app/[locale]/ai-chat/page.tsx")
        sidebar = read("frontend/src/components/AiChat/LeftSidebar.tsx")
        types_file = read("frontend/src/types/types.ts")

        self.assertIn("async def get_feedback_insights(self, username: str)", mongo)
        self.assertIn("top_knowledge_gaps", mongo)
        self.assertIn("recent_unhelpful_questions", mongo)
        self.assertIn('/users/{username}/feedback-insights', chat_endpoint)
        self.assertIn("return await db.get_feedback_insights(username)", chat_endpoint)
        self.assertIn("export interface FeedbackInsights", types_file)
        self.assertIn("export interface FeedbackInsightKnowledgeBase", types_file)
        self.assertIn("export interface FeedbackInsightQuestion", types_file)
        self.assertIn("getFeedbackInsights", chat_api)
        self.assertIn("fetchFeedbackInsightSummary", chat_page)
        self.assertIn("feedbackInsights={feedbackInsights}", chat_page)
        self.assertIn("feedbackInsightsTitle", sidebar)
        self.assertIn("feedbackKnowledgeGapTitle", sidebar)
        self.assertIn("feedbackRecentQuestionsTitle", sidebar)


if __name__ == "__main__":
    unittest.main()
