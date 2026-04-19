import json
from aiokafka import AIOKafkaConsumer, ConsumerRecord
from app.core.config import settings
from app.core.logging import logger
from app.db.redis import redis
from app.rag.utils import process_file, update_task_progress
from app.utils.timezone import beijing_time_now
from app.workflow.workflow_engine import WorkflowEngine

KAFKA_TOPIC = settings.kafka_topic
KAFKA_BOOTSTRAP_SERVERS = settings.kafka_broker_url
KAFKA_PRIORITY_HEADER = "priority"
KAFKA_GROUP_ID = settings.kafka_group_id


class KafkaConsumerManager:
    def __init__(self):
        self.consumer = None

    async def start(self):
        if not self.consumer:
            self.consumer = AIOKafkaConsumer(
                KAFKA_TOPIC,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                group_id=KAFKA_GROUP_ID,
                enable_auto_commit=False,  # 手动提交消息
                max_poll_interval_ms=7200000,  # 2小时

            )
            await self.consumer.start()

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()

    async def process_message(self, msg: ConsumerRecord):
        message = json.loads(msg.value.decode("utf-8"))
        if message.get("type") == "workflow":
            await self.process_workflow_task(message)
        elif message.get("type") == "debug_resume":
            await self.process_workflow_task(message, debug_resume=True)
        elif message.get("type") == "input_resume":
            await self.process_workflow_task(message, input_resume=True)
        else:
            task_id = message["task_id"]
            username = message["username"]
            knowledge_db_id = message["knowledge_db_id"]
            file_meta = message["file_meta"]
            metadata = message.get("metadata", {})
            redis_connection = await redis.get_task_connection()
            # 更新任务状态
            await update_task_progress(
                redis_connection,
                task_id,
                "processing",
                f"Processing {file_meta['original_filename']}...",
            )

            # 处理文件
            await process_file(
                redis=redis_connection,
                task_id=task_id,
                username=username,
                knowledge_db_id=knowledge_db_id,
                file_meta=file_meta,
                metadata=metadata,
            )

    async def process_workflow_task(
        self, message: dict, debug_resume=False, input_resume=False
    ):
        task_id = message["task_id"]
        workflow_data = message["workflow_data"]
        redis_conn = await redis.get_task_connection()
        try:
            # 更新并通知workflow启动
            # 检查任务是否已取消
            redis_conn = await redis.get_task_connection()
            exists = await redis_conn.exists(f"workflow:{task_id}:operator")
            if exists:
                status = await redis_conn.hget(f"workflow:{task_id}:operator", "status")
                if status in ["canceling", "canceled", b"canceling", b"canceled"]:
                    await redis_conn.xadd(
                        f"workflow:events:{task_id}",  # 使用新的事件流键
                        {
                            "type": "workflow",
                            "status": "canceled",
                            "result": "",
                            "error": "Workflow canceled by user",
                            "create_time": str(beijing_time_now()),
                        },
                    )
                    logger.info(f"Skipping canceled task: {task_id}")
                    return

            await redis_conn.hset(f"workflow:{task_id}", "status", "running")
            # 发送事件到专用Stream
            await redis_conn.xadd(
                f"workflow:events:{task_id}",  # 使用新的事件流键
                {
                    "type": "workflow",
                    "status": "running",
                    "result": "",
                    "error": "",
                    "create_time": str(beijing_time_now()),
                },
            )
            async with WorkflowEngine(
                username=message["username"],
                nodes=workflow_data["nodes"],
                edges=workflow_data["edges"],
                global_variables=workflow_data["global_variables"],
                start_node=workflow_data["start_node"],
                task_id=task_id,  # 传递task_id用于状态更新
                breakpoints=workflow_data["breakpoints"],
                user_message=workflow_data["user_message"],
                parent_id=workflow_data["parent_id"],
                temp_db_id=workflow_data["temp_db_id"],
                chatflow_id=workflow_data["chatflow_id"],
                docker_image_use=workflow_data["docker_image_use"],
                need_save_image=workflow_data["need_save_image"],
            ) as engine:

                # 加载状态（如果是恢复执行）
                if debug_resume or input_resume:
                    if await engine.load_state():
                        logger.info(f"Resuming workflow {task_id} from saved state")
                    else:
                        raise ValueError("Workflow expired!")
                # 验证工作流
                if not engine.graph[0]:
                    raise ValueError(engine.graph[-1])

                # 执行工作流
                await engine.start(debug_resume, input_resume)

                # 保存结果并通知完成
                await redis_conn.hset(
                    f"workflow:{task_id}",
                    mapping={
                        "status": "completed",
                        "result": json.dumps(engine.context),
                        "end_time": str(beijing_time_now()),
                    },
                )
                # 发送事件到专用Stream
                # 任务完成时发送事件
                if engine.break_workflow:
                    await engine.save_state()
                    workflow_status = "pause"
                elif engine.break_workflow_get_input:
                    await engine.save_state()
                    workflow_status = "vlm_input"
                else:
                    workflow_status = "completed"

            await redis_conn.xadd(
                f"workflow:events:{task_id}",
                {
                    "type": "workflow",
                    "status": workflow_status,
                    "result": json.dumps(engine.context),
                    "error": "",
                    "create_time": str(beijing_time_now()),
                },
            )

        except Exception as e:
            await redis_conn.hset(
                name=f"workflow:{task_id}",
                mapping={
                    "status": "failed",
                    "error": str(e),
                    "end_time": str(beijing_time_now()),
                },
            )
            await redis_conn.xadd(
                f"workflow:events:{task_id}",
                {
                    "type": "workflow",
                    "status": "failed",
                    "result": "",
                    "error": str(e),
                    "create_time": str(beijing_time_now()),
                },
            )
            logger.exception(
                f"Workflow task failed: : {str(e)}"
            )  # exception自动记录异常
        finally:
            # 刷新过期时间
            pipeline = redis_conn.pipeline()
            pipeline.expire(f"workflow:{task_id}", 3600)
            pipeline.expire(f"workflow:{task_id}:nodes", 3600)
            pipeline.expire(f"workflow:events:{task_id}", 3600)
            pipeline.expire(f"workflow:{task_id}:operator", 3600)
            await pipeline.execute()

    # @retry(stop=stop_after_attempt(5), wait=wait_fixed(2))
    async def consume_messages(self):
        """持续消费Kafka消息."""
        await self.start()
        try:
            async for msg in self.consumer:  # 异步循环消费消息
                logger.info(f"Received message from partition {msg.partition}")
                try:
                    await self.consumer.commit()  # 手动提交消息，确保处理成功才提交
                    await self.process_message(msg)  # 处理每条消息
                except Exception as e:
                    logger.error(f"Error processing message: {e}")

        except Exception as e:
            logger.exception(f"Error consuming messages: {e}")
            raise e


kafka_consumer_manager = KafkaConsumerManager()
