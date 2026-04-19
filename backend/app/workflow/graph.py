from typing import Dict, List, Optional, Set
from collections import defaultdict, deque


class TreeNode:
    __slots__ = [
        "node_id",
        "node_type",
        "data",
        "children",
        "loop_info",
        "parents",
        "loop_next",
        "loop_parent",
        "condition",
        # "loop_index",
        "loop_last",
        "loop_children",
        "debug_skip",
        "input_skip",
    ]
    _instances = {}

    def __new__(cls, node_id: str, node_type: str, data: Dict):
        if node_id not in cls._instances:
            instance = super().__new__(cls)
            instance.node_id = node_id
            instance.node_type = node_type
            instance.data = data
            instance.children = []
            instance.loop_info = []
            instance.parents = []
            instance.loop_next = []
            instance.loop_parent = None  # 所属循环节点
            instance.loop_children = []  # 循环的所有子节点
            # instance.loop_index = None  # 当前的循环次数
            instance.loop_last = []  # 循环结束需要执行的节点
            instance.condition = None
            instance.debug_skip = False
            instance.input_skip = False
            cls._instances[node_id] = instance
        return cls._instances[node_id]

    @classmethod
    def get_node(cls, node_id: str):
        return cls._instances.get(node_id)

    @classmethod
    def clear_instances(cls):
        cls._instances.clear()


class WorkflowGraph:
    def __init__(self, nodes: List[Dict], edges: List[Dict], start_node):
        TreeNode.clear_instances()  # 确保实例清理
        self.nodes = {n["id"]: n for n in nodes}
        self.edges = edges
        self.root = TreeNode(start_node, "start", {"name": "Start"})
        self._build_graph(self.root, parent=None, current_loop_parent=None)
        self._validate_hierarchy()
        self._check_directed_cycles()

    def _find_edges(self, source: str) -> List[Dict]:
        return [e for e in self.edges if e.get("source") == source]

    def _build_graph(
        self,
        node: TreeNode,
        parent: Optional[TreeNode],
        current_loop_parent: Optional[TreeNode],
    ):
        node.loop_parent = current_loop_parent
        if current_loop_parent:
            current_loop_parent.loop_children.append(node)

        if parent and parent not in node.parents:
            node.parents.append(parent)

        for edge in self._find_edges(node.node_id):
            self._process_edge(node, edge, current_loop_parent)

    def _process_edge(self, node: TreeNode, edge: Dict, current_loop_parent: TreeNode):
        source_handle = edge.get("sourceHandle", "")
        target_id = edge["target"]
        target_node = TreeNode(
            target_id, self.nodes[target_id]["type"], self.nodes[target_id]["data"]
        )

        try:
            if source_handle == "":
                self._validate_normal_edge(node, target_node, current_loop_parent)
                self._add_child(node, target_node, current_loop_parent)
            elif source_handle.startswith("condition"):
                try:
                    condition_index = int(source_handle.split("-")[-1])
                except:
                    raise ValueError(f"非法condition类型: {source_handle}")
                self._validate_condition_edge(
                    node, target_node, current_loop_parent, condition_index
                )
                target_node.condition = condition_index
                self._add_child(node, target_node, current_loop_parent)
            elif source_handle == "loop_body":
                self._validate_loop_body_edge(node)
                self._add_loop_child(node, target_node)
            elif source_handle == "loop_next":
                self._validate_loop_next_edge(node, target_node)
                self._add_loop_exit(node, target_node)
            else:
                raise ValueError(f"非法边类型: {source_handle}")
        except ValueError as e:
            raise type(e)(
                f"节点 {node.data['name']} -> {target_node.data['name']}: {str(e)}"
            ) from e

    # 校验方法组
    def _validate_normal_edge(
        self, source: TreeNode, target: TreeNode, current_loop_parent: TreeNode
    ):
        if target.loop_parent not in {None, current_loop_parent}:
            raise ValueError(
                f"跨层级连接: {source.data['name']}(层级:{self._get_hierarchy_path(source)}) "
                f"-> {target.data['name']}(层级:{self._get_hierarchy_path(target)})"
            )

    def _validate_condition_edge(
        self,
        source: TreeNode,
        target: TreeNode,
        current_loop_parent: TreeNode,
        condition_index: int,
    ):
        if source.node_type != "condition":
            raise ValueError("非条件节点使用condition边")
        if target.loop_parent not in {None, current_loop_parent}:
            raise ValueError(
                f"跨层级连接: {source.data['name']}(层级:{self._get_hierarchy_path(source)}) "
                f"-> {target.data['name']}(层级:{self._get_hierarchy_path(target)})"
            )
        # if len(source.data["conditions"]) <= condition_index:
        #     raise ValueError("条件节点边连接错误")

    def _validate_loop_body_edge(self, node: TreeNode):
        if node.node_type != "loop":
            raise ValueError("非循环节点使用loop_body边")

    def _validate_loop_next_edge(self, node: TreeNode, target_node: TreeNode):
        if node.loop_parent != target_node:
            raise ValueError("循环节点的loop_next边出口不是原loop节点")
        if node.node_type == "condition":
            raise ValueError("循环节点的loop_next出口不能是condition节点")
        if target_node.node_type != "loop":
            raise ValueError("非循环节点使用loop_next边")
        if len(target_node.loop_next) >= 1:
            raise ValueError("循环节点只能有一个loop_next出口")

    # 层级路径显示方法
    def _get_hierarchy_path(self, node: TreeNode) -> str:
        path = []
        current = node.loop_parent
        while current:
            path.append(current.data["name"])
            current = current.loop_parent
        return "->".join(reversed(path)) if path else "root"

    # 添加关系方法组
    def _add_child(
        self, parent: TreeNode, child: TreeNode, current_loop_parent: TreeNode
    ):
        if child not in parent.children:
            parent.children.append(child)
            self._build_graph(child, parent, current_loop_parent)

    def _add_loop_child(self, loop_node: TreeNode, child: TreeNode):
        if child not in loop_node.loop_info:
            loop_node.loop_info.append(child)
            if len(loop_node.loop_info) > 1:
                raise ValueError("循环节点只能有一个loop_body入口")
            self._build_graph(child, [], loop_node)

    def _add_loop_exit(self, last_child_node: TreeNode, loop_node: TreeNode):
        if last_child_node not in loop_node.loop_last:
            loop_node.loop_last.append(last_child_node)
            # loop_node.loop_index = 0

    # 层级完整性校验
    def _validate_hierarchy(self):
        for node in TreeNode._instances.values():
            for child in node.children:
                if child.loop_parent != node.loop_parent:
                    raise ValueError(
                        f"子节点层级断裂: {node.data['name']} -> {child.data['name']}\n"
                        f"父层级: {self._get_hierarchy_path(node)}\n"
                        f"子层级: {self._get_hierarchy_path(child)}"
                    )

    # 有向环检测
    def _check_directed_cycles(self):
        visited = defaultdict(int)
        path = deque()
        path_name = deque()
        cycle = None
        cycle_name = None

        def dfs(current: TreeNode):
            nonlocal cycle, cycle_name
            if visited[current.node_id] == 1:
                cycle = list(path) + [current.node_id]
                cycle_name = list(path_name) + [current.data["name"]]
                raise ValueError("")
            if visited[current.node_id] == 2:
                return

            visited[current.node_id] = 1
            path.append(current.node_id)
            path_name.append(current.data["name"])

            for child in current.children + current.loop_info + current.loop_next:
                dfs(child)

            visited[current.node_id] = 2
            path.pop()
            path_name.pop()

        try:
            for node in TreeNode._instances.values():
                if visited[node.node_id] == 0:
                    dfs(node)
        except ValueError:
            cycle_str = " -> ".join(cycle_name)
            raise ValueError(
                f"检测到有向环: {cycle_str}\n循环请使用loop节点包裹！"
            ) from None

    # 调试用
    def print_tree(
        self, node: TreeNode = None, visited: Dict[str, bool] = None, loop: str = ""
    ):
        if not node:
            node = self.root
        if visited is None:
            visited = {}

        # 检查是否已经访问过该节点，避免循环
        if node.node_id in visited and visited[node.node_id]:
            return

        # 标记当前节点为已访问
        visited[node.node_id] = True

        # 打印节点信息
        if loop:
            print(f"{loop}, Node ID: {node.node_id}")
            # print(f"{loop}, Node Type: {node.node_type}")
        else:
            print(f"Node ID: {node.node_id}")
            # print(f"Node Type: {node.node_type}")

        # 如果有 loop_info，打印
        if node.loop_info:
            print(f"{loop}  Loop Info:")
            for loop_node in node.loop_info:
                if loop:
                    self.print_tree(
                        loop_node,
                        visited,
                        loop=f"   {loop},  - Loop Node ID: {loop_node.node_id}",
                    )
                else:
                    self.print_tree(
                        loop_node,
                        visited,
                        loop=f"      - Loop Node ID: {loop_node.node_id}",
                    )

        # 递归打印子节点
        for child in node.children:
            self.print_tree(child, visited, loop)
