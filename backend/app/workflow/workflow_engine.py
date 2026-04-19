# workflow/workflow_engine.py
import asyncio
import json
import re
from typing import Dict, List, Any, Optional
import uuid
import docker

from app.db.redis import redis
from app.models.workflow import UserMessage
from app.utils.timezone import beijing_time_now
from app.workflow.mcp_tools import mcp_call_tools
from app.workflow.sandbox import CodeSandbox
from app.workflow.code_scanner import CodeScanner
from app.workflow.graph import TreeNode, WorkflowGraph
from app.workflow.llm_service import ChatService
from app.core.logging import logger
from app.workflow.utils import find_outermost_braces, replace_template


class WorkflowEngine:
    def __init__(
        self,
        username: str,
        nodes: List[Dict],
        edges: List[Dict],
        global_variables,
        start_node="node_start",
        task_id: str = None,
        breakpoints=None,
        user_message="",
        parent_id="",
        temp_db_id="",
        chatflow_id="",
        docker_image_use="python-sandbox:latest",
        need_save_image="",
    ):
        self.nodes = nodes
        self.edges = edges
        self.start_node = start_node
        self.global_variables = global_variables
        self.context: Dict[str, Any] = {}
        self.scanner = CodeScanner()
        self.graph = self.get_graph()
        self.execution_status = {node["id"]: False for node in self.nodes}
        # 延迟初始化沙箱
        self.sandbox: Optional[CodeSandbox] = None
        self.task_id = task_id  # Kafka任务id
        self.breakpoints = set(breakpoints or [])
        self.execution_stack = [self.graph[1]]  # 用栈结构保存执行状态
        self.break_workflow = False
        self.break_workflow_get_input = False
        self.skip_nodes = []
        self.loop_index = {}
        self.user_message = user_message
        self.parent_id = parent_id
        self.temp_db_id = temp_db_id
        self.chatflow_id = chatflow_id
        self.user_image_urls = []
        self.supply_info = ""  # mcp等工具调用产生的额外的llm输入信息
        self.docker_image_use = (
            "sandbox-" + username + "-" + docker_image_use
            if (docker_image_use and not docker_image_use == "python-sandbox:latest")
            else "python-sandbox:latest"
        )
        self.need_save_image = (
            "sandbox-" + username + "-" + need_save_image if need_save_image else ""
        )

    async def __aenter__(self):
        # 创建并启动沙箱
        self.sandbox = CodeSandbox(self.docker_image_use)

        await self.sandbox.__aenter__()
        if not self.sandbox:
            raise ValueError(
                f"镜像'{'-'.join(self.docker_image_use.split('-')[2:])}'启动失败，请检查镜像是否存在"
            )
        return self

    async def __aexit__(self, exc_type, exc, tb):
        # 退出上下文时清理资源
        if self.sandbox:
            if self.need_save_image and not self.sandbox.failed:
                new_image = await self.sandbox.commit(
                    self.need_save_image.split(":")[0],
                    self.need_save_image.split(":")[1],
                )
                redis_conn = await redis.get_task_connection()
                await redis_conn.xadd(
                    f"workflow:events:{self.task_id}",  # 使用新的事件流键
                    {
                        "type": "workflow",
                        "status": "dockering",
                        "result": new_image,
                        "error": "",
                        "create_time": str(beijing_time_now()),
                    },
                )
                # 清理沙箱
            await self.sandbox.__aexit__(exc_type, exc, tb)

    async def save_state(self):
        """保存当前执行状态到Redis"""
        state = {
            "global_variables": self.global_variables,
            "execution_status": self.execution_status,
            "execution_stack": [n.node_id for n in self.execution_stack],
            "loop_index": self.loop_index,
            "context": self.context,
            "skip_nodes": self.skip_nodes,
            "nodes": self.nodes,  # 保存节点定义
            "edges": self.edges,  # 保存边定义
        }
        redis_conn = await redis.get_task_connection()
        await redis_conn.setex(
            f"workflow:{self.task_id}:state", 3600, json.dumps(state)
        )

    async def load_state(self):
        """从Redis加载执行状态"""
        redis_conn = await redis.get_task_connection()
        state = await redis_conn.get(f"workflow:{self.task_id}:state")
        if state:
            state = json.loads(state)
            self.global_variables = state["global_variables"]
            self.execution_status = state["execution_status"]
            self.loop_index = state["loop_index"]
            self.context = state["context"]
            # 重建执行栈
            self.execution_stack = [
                TreeNode.get_node(nid) for nid in state["execution_stack"]
            ]
            self.skip_nodes = state["skip_nodes"]
            return True
        return False

    async def _send_pause_event(self, node: TreeNode, chatInput: bool = False):
        redis_conn = await redis.get_task_connection()
        if chatInput and not self.breakpoints:
            status = "vlm_input"
        # input中断同时处于调试模式
        elif chatInput and self.breakpoints:
            status = "vlm_input_debug"
        else:
            status = "pause"
        await redis_conn.xadd(
            f"workflow:events:{self.task_id}",
            {
                "type": "node",
                "node": node.node_id,
                "status": status,
                "result": "",
                "error": "",
                "variables": json.dumps(self.global_variables),
                "create_time": str(beijing_time_now()),
            },
        )
        # 刷新过期时间
        pipeline = redis_conn.pipeline()
        pipeline.expire(f"workflow:{self.task_id}", 3600)
        pipeline.expire(f"workflow:{self.task_id}:nodes", 3600)
        pipeline.expire(f"workflow:events:{self.task_id}", 3600)
        await pipeline.execute()

    def get_graph(self):
        try:
            self.graph = WorkflowGraph(self.nodes, self.edges, self.start_node)
            root = self.graph.root
            msg = "工作流验证通过"
            return (True, root, msg)
        except ValueError as e:
            msg = f"工作流验证失败: {str(e)}"
            return (False, [], msg)

    def safe_eval(self, expr: str, node_name: str, node_id: str) -> bool:
        """安全执行条件表达式"""
        # 扫描表达式代码
        scan_result = self.scanner.scan_code(expr)
        if not scan_result["safe"]:
            raise ValueError(
                f"{node_id}:节点{node_name}: 不安全的表达式: {expr}, 问题: {scan_result['issues']}"
            )

        # 限制执行环境，仅允许访问context变量
        try:
            return eval(
                expr,
                # {"__builtins__": {int}},  # 禁用内置函数
                {
                    k: (v if v == "" else eval(v))
                    for k, v in self.global_variables.items()
                },  # 暴露context到表达式
            )
        except Exception as e:
            raise ValueError(f"节点{node_name}: 表达式执行错误: {expr}, 错误: {str(e)}")

    async def handle_condition(self, node: TreeNode) -> TreeNode:
        conditions = node.data.get("conditions", [])
        matched = []
        condition_child = []
        condition_pass = []
        child_pass = []
        for idx, cond in conditions.items():
            try:
                if self.safe_eval(cond, node.data["name"], node.node_id):
                    matched.append(int(idx))
                    condition_pass.append(str(idx))
            except Exception as e:
                raise ValueError(
                    f"{node.node_id}: 节点{node.data['name']}: 条件表达式错误: {cond} \n {e}"
                )

        if len(matched) == 0:
            # raise ValueError(f"节点 {node.node_id} 条件表达式错误, 找不到出口")
            pass

        for child in node.children:
            if child.condition in matched:
                condition_child.append(child)
                child_pass.append(str(child.condition))
            else:
                self.skip_nodes.append(child.node_id)

        if len(child_pass) == 0:
            result_connection_index = "No Connection Passed!"
        else:
            result_connection_index = "Passed Connection Index: " + " ".join(child_pass)
        if len(condition_pass) == 0:
            result_condition_index = ("No Condition Passed!",)
        else:
            result_condition_index = (
                "Passed Condition Index: " + " ".join(condition_pass),
            )
        if not node.node_id in self.context:
            self.context[node.node_id] = [
                {
                    "result": result_connection_index,
                    "condition_child": result_condition_index,
                }
            ]
        else:
            self.context[node.node_id].append(
                {
                    "result": result_connection_index,
                    "condition_child": result_condition_index,
                }
            )

        return condition_child

    async def _set_loop_node_execution_status(
        self, node: TreeNode, status: bool = False
    ):
        self.execution_status[node.node_id] = status
        await self._update_node_status(node.node_id, status)
        for child in node.children:
            await self._set_loop_node_execution_status(child, status)

    async def handle_loop(self, node: TreeNode):
        if not node.node_id in self.loop_index:
            self.loop_index[node.node_id] = 0
        if len(node.loop_last) == 0:
            raise ValueError(
                f"{node.node_id}: 节点{node.data['name']}: 循环节点没有loop_next出口"
            )
        loop_type = node.data["loopType"]
        loop_info = node.loop_info
        if len(loop_info) != 1:
            raise ValueError(
                f"{node.node_id}: 节点{node.data['name']}: 循环节点只能有一个loop_body入口"
            )

        loop_node = loop_info[0]
        if loop_type == "count":
            maxCount = node.data["maxCount"]
            # while node.loop_index < int(maxCount):
            # 执行状态设为false保证可以循环
            if self.loop_index[node.node_id] < int(maxCount):
                await self._set_loop_node_execution_status(loop_node)
                await self.execute_workflow(loop_node)
            else:
                self.execution_status[node.node_id] = True
                await self._update_node_status(node.node_id, True)
                for child in node.children:
                    await self.execute_workflow(child)
                return

        elif loop_type == "condition":
            condition = node.data["condition"]
            if condition:
                if self.safe_eval(condition, node.data["name"], node.node_id):
                    logger.info(
                        f"工作流 {self.task_id} ->节点 {node.node_id} 通过条件判断终止"
                    )
                    self.execution_status[node.node_id] = True
                    await self._update_node_status(node.node_id, True)
                    for child in node.children:
                        await self.execute_workflow(child)
                    return

            if self.loop_index[node.node_id] < 100:
                await self._set_loop_node_execution_status(loop_node)
                await self.execute_workflow(loop_node)
                # if self.safe_eval(condition, node.data["name"], node.node_id):
                #     break
        else:
            raise ValueError(f"{node.node_id}: 节点{node.data['name']}: 未知的循环类型")

    async def execute_workflow(self, node: TreeNode):
        """
        递归运行节点
        """
        logger.info(f"工作流 {self.task_id} 执行节点{node.node_id} 开始运行")
        await self.check_cancellation()

        if node.node_id not in self.execution_status:
            logger.error(f"工作流 {self.task_id} 找不到开始节点！")
            raise ValueError("'Start Node' no found!")

        if self.execution_status[node.node_id]:
            logger.info(f"工作流 {self.task_id} 节点 {node.node_id} 已经运行过了")
            return
        # 等待父节点执行完
        for parent in node.parents:
            if not self.execution_status[parent.node_id]:
                return

        # 检查condition的子节点是否不满足条件跳过
        if node.node_id in self.skip_nodes:
            self.execution_status[node.node_id] = True
            # tasks = []
            for child in node.children:
                self.skip_nodes.append(child.node_id)
                await self.execute_workflow(child)
            #     task = asyncio.create_task(self.execute_workflow(child))
            #     tasks.append(task)
            # await asyncio.wait(tasks)
            if node.loop_parent:
                if node in node.loop_parent.loop_last:
                    if all(
                        self.execution_status[last_loop_node.node_id]
                        for last_loop_node in node.loop_parent.loop_last
                    ):
                        self.skip_nodes = [
                            node_id
                            for node_id in self.skip_nodes
                            if not any(
                                node_id == node.node_id
                                for node in node.loop_parent.loop_children
                            )
                        ]
                        self.loop_index[node.loop_parent.node_id] += 1
                        await self.execute_workflow(node.loop_parent)
            return

        # 检查暂停点
        if node.node_id in self.breakpoints:
            if node.debug_skip:
                node.debug_skip = False
            else:
                self.execution_stack.append(node)
                await self._send_pause_event(node)
                self.break_workflow = True
                return

        await self._update_node_status(node.node_id, True, True)

        if node.node_type == "loop":
            await self.handle_loop(node)
            if node.loop_parent:
                if node in node.loop_parent.loop_last:
                    if all(
                        self.execution_status[last_loop_node.node_id]
                        for last_loop_node in node.loop_parent.loop_last
                    ):
                        self.loop_index[node.node_id] = 0
                        self.loop_index[node.loop_parent.node_id] += 1
                        self.skip_nodes = [
                            node_id
                            for node_id in self.skip_nodes
                            if not any(
                                node_id == node.node_id
                                for node in node.loop_parent.loop_children
                            )
                        ]
                        await self.execute_workflow(node.loop_parent)

        elif node.node_type == "condition":
            pointer_nodes = await self.handle_condition(node)
            self.execution_status[node.node_id] = True
            await self._update_node_status(node.node_id, True)
            # 异步执行子节点
            # tasks = []
            # to do check
            # for child in pointer_nodes:
            for child in node.children:
                await self.execute_workflow(child)
            #     task = asyncio.create_task(self.execute_workflow(child))
            #     tasks.append(task)
            # await asyncio.wait(tasks)
        else:
            result = await self.execute_node(node)
            if not result:
                return
            self.execution_status[node.node_id] = True
            await self._update_node_status(node.node_id, True)
            # 异步执行子节点
            # tasks = []
            for child in node.children:
                await self.execute_workflow(child)
            #     task = asyncio.create_task(self.execute_workflow(child))
            #     tasks.append(task)
            # await asyncio.wait(tasks)
            if node.loop_parent:
                if node in node.loop_parent.loop_last:
                    if all(
                        self.execution_status[last_loop_node.node_id]
                        for last_loop_node in node.loop_parent.loop_last
                    ):
                        self.loop_index[node.loop_parent.node_id] += 1
                        self.skip_nodes = [
                            node_id
                            for node_id in self.skip_nodes
                            if not any(
                                node_id == node.node_id
                                for node in node.loop_parent.loop_children
                            )
                        ]
                        await self.execute_workflow(node.loop_parent)

    async def _update_node_status(
        self, node_id: str, status: bool, running: bool = False, error: str = ""
    ):
        """更新Redis中节点状态"""
        if self.task_id:
            redis_conn = await redis.get_task_connection()
            await redis_conn.hset(
                f"workflow:{self.task_id}:nodes", node_id, str(int(status))
            )
            # 添加类型标识
            # 发送事件到专用Stream
            if running:
                node_status = "running"
            else:
                node_status = str(int(status))
            await redis_conn.xadd(
                f"workflow:events:{self.task_id}",  # 使用新的事件流键
                {
                    "type": "node",
                    "node": node_id,
                    "status": node_status,
                    "result": json.dumps(self.context.get(node_id, "")),
                    "error": error,
                    "variables": json.dumps(self.global_variables),
                    "create_time": str(beijing_time_now()),
                },
            )
            # 刷新过期时间
            pipeline = redis_conn.pipeline()
            pipeline.expire(f"workflow:{self.task_id}", 3600)
            pipeline.expire(f"workflow:{self.task_id}:nodes", 3600)
            pipeline.expire(f"workflow:events:{self.task_id}", 3600)
            await pipeline.execute()

    async def execute_node(self, node: TreeNode):
        if node.node_type == "code":
            # 执行代码节点
            code = node.data.get("code", "")

            inputs = self.global_variables  # get_node_inputs(node, context)

            try:
                # 1. 代码扫描
                scan_result = self.scanner.scan_code(code)
                if not scan_result["safe"]:
                    raise ValueError(
                        f"{node.node_id}: 节点{node.data['name']}: 代码安全扫描未通过: {scan_result['issues']}"
                    )

                # 2. 沙箱执行
                result = await self.sandbox.execute(
                    code=code,
                    inputs=inputs,
                    pip=node.data.get("pip", None),
                    image_url=node.data.get("imageUrl", ""),
                    remove=node.data.get("remove", False),
                    timeout=node.data.get("timeout", 3600),
                )
                output = result["result"].split("####Global variable updated####")
                code_output = output[0]
                if len(output) > 1:
                    new_global_variables_list = output[1].split("\n\n")[0]
                    self.global_variables = {
                        equation.split(" = ")[0]: equation.split(" = ")[1]
                        for equation in new_global_variables_list.split("\n")[1:]
                    }
                if not node.node_id in self.context:
                    self.context[node.node_id] = [{"result": code_output}]
                else:
                    self.context[node.node_id].append({"result": code_output})
                return True
            except docker.errors.ContainerError as e:
                # logger.error(f"容器执行错误: {e.stderr}")
                raise ValueError(
                    f"{node.node_id}: 节点{node.data['name']}: 容器执行错误: {e.stderr}"
                )  # HTTPException(status_code=400, detail=e.stderr)
            except json.JSONDecodeError:
                raise ValueError(
                    f"{node.node_id}: 节点{node.data['name']}: 输出格式无效,非json格式"
                )  # HTTPException(status_code=400, detail="输出格式无效")
        elif node.node_type == "vlm":
            message_id = str(uuid.uuid4())
            try:
                if node.data["isChatflowInput"]:
                    if node.input_skip:
                        node.input_skip = False
                        vlm_input = self.user_message
                        temp_db_id = self.temp_db_id
                    else:
                        self.execution_stack.append(node)
                        await self._send_pause_event(node, True)
                        self.break_workflow_get_input = True
                        return False
                else:
                    vlm_input = node.data["vlmInput"]
                    temp_db_id = ""
                vlm_input = replace_template(vlm_input, self.global_variables)
                system_prompt = replace_template(
                    node.data["prompt"], self.global_variables
                )

                ##### mcp section #####
                mcp_tools_for_call = {}
                mcp_servers: dict = node.data["mcpUse"]
                if mcp_servers:
                    load_ai_messgae = json.dumps(
                        {
                            "type": "text",
                            "data": "#### Starting MCP call, LLM is selecting tools...  \n",
                            "message_id": message_id,
                        }
                    )
                    await self._send_ai_chunk_event(
                        node.node_id, message_id, load_ai_messgae, "mcp"
                    )
                    logger.info(f"MCP:工作流{self.task_id}开始mcp调用")
                    for mcp_server_name, mcp_server_tools in mcp_servers.items():
                        mcp_server_url = mcp_server_tools.get("mcpServerUrl")
                        mcp_tools = mcp_server_tools.get("mcpTools")
                        mcp_headers = mcp_server_tools.get("headers", None)
                        mcp_timeout = mcp_server_tools.get("timeout", 5)
                        mcp_sse_read_timeout = mcp_server_tools.get(
                            "sseReadTimeout", 60 * 5
                        )
                        for mcp_tool in mcp_tools:
                            mcp_tool["url"] = mcp_server_url
                            mcp_tools_for_call[mcp_tool["name"]] = mcp_tool
                    mcp_prompt = f"""
You are an expert in selecting function calls. Please choose the most appropriate function call based on the user's question and provide the required parameters. Output in JSON format: {{"function_name": function name, "params": parameters}}. Do not include any other content. If the user's question is unrelated to functions, output {{"function_name":""}}.
Here is the JSON function list: {json.dumps(mcp_tools_for_call)}"""
                    mcp_user_message = UserMessage(
                        conversation_id=self.chatflow_id,
                        parent_id="",
                        user_message=vlm_input,
                        temp_db_id=self.temp_db_id,
                    )
                    # 获取流式生成器（假设返回结构化数据块）
                    mcp_stream_generator = ChatService.create_chat_stream(
                        user_message_content=mcp_user_message,
                        model_config=node.data["modelConfig"],
                        message_id=message_id,
                        system_prompt=mcp_prompt,
                        save_to_db=False,
                        user_image_urls=[],
                        quote_variables=self.global_variables,
                    )
                    mcp_full_response = []
                    mcp_chunks = []
                    async for chunk in mcp_stream_generator:
                        await self._send_ai_chunk_event(
                            node.node_id, message_id, chunk, "mcp"
                        )
                        mcp_chunks.append(json.loads(chunk))
                    for chunk in mcp_chunks:
                        if chunk.get("type") == "text":
                            mcp_full_response.append(chunk.get("data"))
                    mcp_full_response_json = "".join(mcp_full_response)
                    mcp_outermost_braces_string_list = find_outermost_braces(
                        mcp_full_response_json
                    )
                    try:
                        mcp_outermost_braces_string = mcp_outermost_braces_string_list[
                            -1
                        ]
                        mcp_outermost_braces_dict = json.loads(
                            mcp_outermost_braces_string
                        )
                        function_name = mcp_outermost_braces_dict.get("function_name")
                        if function_name:
                            params = mcp_outermost_braces_dict.get("params")
                            try:
                                result = await mcp_call_tools(
                                    mcp_tools_for_call[function_name]["url"],
                                    function_name,
                                    params,
                                    headers=mcp_headers,
                                    timeout=mcp_timeout,
                                    sse_read_timeout=mcp_sse_read_timeout,
                                )
                                self.supply_info = f"\nPlease answer the question based on these results: {result}"
                                logger.info("MCP:工作流{self.task_id}mcp调用成功")
                                load_ai_messgae = json.dumps(
                                    {
                                        "type": "text",
                                        "data": f"  \n#### MCP call succeeded, returned result:  \n{result}  \n",
                                        "message_id": message_id,
                                    }
                                )
                                await self._send_ai_chunk_event(
                                    node.node_id, message_id, load_ai_messgae, "mcp"
                                )
                            except Exception as e:
                                load_ai_messgae = json.dumps(
                                    {
                                        "type": "text",
                                        "data": f"  \n#### MCP call for function {function_name} with parameters: {params} failed  \n",
                                        "message_id": message_id,
                                    }
                                )
                                await self._send_ai_chunk_event(
                                    node.node_id, message_id, load_ai_messgae, "mcp"
                                )
                                logger.error(
                                    f"MCP:工作流{self.task_id}函数{function_name},参数：{params}的MCP调用失败：{e}"
                                )
                        else:
                            load_ai_messgae = json.dumps(
                                {
                                    "type": "text",
                                    "data": f"  \n#### No suitable MCP call tool found.  \n",
                                    "message_id": message_id,
                                }
                            )
                            await self._send_ai_chunk_event(
                                node.node_id, message_id, load_ai_messgae, "mcp"
                            )
                            logger.info(
                                f"MCP:工作流{self.task_id}未找到合适的MCP调用工具。"
                            )
                    except Exception as e:
                        load_ai_messgae = json.dumps(
                            {
                                "type": "text",
                                "data": f"  \n#### No valid JSON output parsed, please optimize the backend MCP prompt.  \n",
                                "message_id": message_id,
                            }
                        )
                        await self._send_ai_chunk_event(
                            node.node_id, message_id, load_ai_messgae, "mcp"
                        )
                        logger.info(
                            f"MCP:工作流{self.task_id}的MCP调用未解析到json输出：{e}"
                        )
                ##### mcp section #####

                load_ai_messgae = json.dumps(
                    {"type": "text", "data": "", "message_id": message_id}
                )
                await self._send_ai_chunk_event(
                    node.node_id, message_id, load_ai_messgae
                )
                user_message = UserMessage(
                    conversation_id=self.chatflow_id,
                    parent_id=self.parent_id if node.data["useChatHistory"] else "",
                    user_message=vlm_input,
                    temp_db_id=temp_db_id,
                )
                # 获取流式生成器（假设返回结构化数据块）
                stream_generator = ChatService.create_chat_stream(
                    user_message_content=user_message,
                    model_config=node.data["modelConfig"],
                    message_id=message_id,
                    system_prompt=system_prompt,
                    save_to_db=True if node.data["isChatflowOutput"] else False,
                    user_image_urls=self.user_image_urls,
                    supply_info=self.supply_info,
                    quote_variables=self.global_variables,
                )
                full_response = []
                chunks = []
                async for chunk in stream_generator:
                    # 发送每个数据块到Redis
                    await self._send_ai_chunk_event(node.node_id, message_id, chunk)
                    # if chunk.get("type") == "text":
                    chunks.append(json.loads(chunk))
                for chunk in chunks:
                    if chunk.get("type") == "text":
                        full_response.append(chunk.get("data"))
                    if chunk.get("type") == "user_images":
                        if node.data["isChatflowInput"]:
                            self.user_image_urls = chunk.get("data")
                full_response_json = "".join(full_response)
                outermost_braces_string_list = find_outermost_braces(full_response_json)
                for outermost_braces_string in outermost_braces_string_list:
                    try:
                        outermost_braces_dict = json.loads(outermost_braces_string)
                        for k, v in outermost_braces_dict.items():
                            if k in self.global_variables:
                                self.global_variables[k] = repr(v)
                    except Exception as e:
                        logger.info(f"LLM:工作流{self.task_id}未解析到json输出：{e}")
                if node.data["chatflowOutputVariable"]:
                    self.global_variables[node.data["chatflowOutputVariable"]] = repr(
                        "".join(full_response)
                    )
                # 以节点ID为键存储完整结果
                if not node.node_id in self.context:
                    self.context[node.node_id] = [{"result": "Message generated!"}]
                else:
                    self.context[node.node_id].append({"result": "Message generated!"})
                return True
            except Exception as e:
                # 错误处理
                raise ValueError(f'{node.node_id}:节点{node.data["name"]}: {str(e)}')
        else:
            return True

    async def _send_ai_chunk_event(
        self, node_id: str, message_id: str, chunk: str, tool: str = ""
    ):
        """发送单个AI生成块到Redis事件流"""
        if tool:
            messgae_type = tool
        else:
            messgae_type = "ai_chunk"
        redis_conn = await redis.get_task_connection()
        event_data = {
            "type": messgae_type,  # 标识为AI数据块
            "node_id": node_id,
            "message_id": message_id,
            "data": chunk,
            "create_time": str(beijing_time_now()),
        }
        await redis_conn.xadd(f"workflow:events:{self.task_id}", event_data)

    async def start(self, debug_resume=False, input_resume=False):
        """迭代式执行方法"""
        run_times = len(self.execution_stack)
        for i in range(run_times):
            current_node = self.execution_stack.pop(0)
            if debug_resume:
                current_node.debug_skip = True
            if input_resume:
                if current_node.node_id in self.breakpoints:
                    current_node.debug_skip = True
                current_node.input_skip = True
            await self.execute_workflow(current_node)

    async def check_cancellation(self):
        """检查取消状态"""
        redis_conn = await redis.get_task_connection()
        status = await redis_conn.hget(f"workflow:{self.task_id}:operator", "status")
        if status == b"canceling" or status == "canceling":
            logger.error("Workflow canceled by user！")
            await self.cleanup()
            raise ValueError("Workflow canceled")

    async def cleanup(self):
        """清理资源"""
        # 1. 停止沙箱容器
        if self.sandbox:
            await self.sandbox.close()

        # 2. 更新Redis状态
        redis_conn = await redis.get_task_connection()
        await redis_conn.hset(
            f"workflow:{self.task_id}",
            mapping={"status": "canceled", "end_time": str(beijing_time_now())},
        )

        # 发送取消事件
        await redis_conn.xadd(
            f"workflow:events:{self.task_id}",
            {
                "type": "workflow",
                "status": "canceled",
                "result": "",
                "error": "Workflow canceled by user",
                "create_time": str(beijing_time_now()),
            },
        )

        # 3. 清理执行状态
        self.execution_stack.clear()
        self.skip_nodes.clear()
