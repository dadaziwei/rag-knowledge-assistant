import asyncio
from typing import Optional
from contextlib import AsyncExitStack
from mcp import ClientSession
from mcp.client.sse import sse_client


class MCPClient:
    def __init__(
        self,
        server_url: str,
        headers: dict = None,
        timeout: float = 5,
        sse_read_timeout: float = 60 * 5,
    ):
        self.server_url = server_url
        self.exit_stack = AsyncExitStack()
        self.headers = headers
        self.timeout = timeout
        self.sse_read_timeout = sse_read_timeout
        self.session: Optional[ClientSession] = None

    async def connect_to_sse_server(self) -> list:
        # Cleanup any existing connections
        await self.cleanup()

        # Establish new connections with proper context management
        streams = await self.exit_stack.enter_async_context(
            sse_client(
                url=self.server_url,
                headers=self.headers,
                timeout=self.timeout,
                sse_read_timeout=self.sse_read_timeout,
            )
        )
        session = await self.exit_stack.enter_async_context(ClientSession(*streams))
        await session.initialize()

        # Store session reference
        self.session = session

    async def list_tools(self) -> list:
        # Get available tools
        response = await self.session.list_tools()
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "input_schema": tool.inputSchema,
            }
            for tool in response.tools
        ]

    async def call_tool(self, tool_name: str, tool_args: dict) -> str:
        if not self.session:
            raise RuntimeError("Not connected to server")
        return await self.session.call_tool(tool_name, tool_args)

    async def cleanup(self):
        # Properly close all context managers
        await self.exit_stack.aclose()
        self.exit_stack = AsyncExitStack()  # Reset for potential reuse
        self.session = None

    # Add async context manager support
    async def __aenter__(self):
        await self.connect_to_sse_server()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.cleanup()


async def mcp_tools(server_url: str, tool_name: str, tool_args: dict) -> str:
    async with MCPClient(server_url) as client:
        return await client.call_tool(tool_name, tool_args)


# Example usage:
# result = await mcp_tools("http://server.url", "tool_name", {"arg": "value"})
async def mcp_list_tools(
    url: str,
    headers: dict = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
):
    # 使用上下文管理器自动管理连接
    try:
        async with MCPClient(url, headers, timeout, sse_read_timeout) as client:
            tools = await client.list_tools()
            return tools
    except:
        return []


async def mcp_call_tools(
    url,
    tool_name,
    tool_args,
    headers: dict = None,
    timeout: float = 5,
    sse_read_timeout: float = 60 * 5,
):
    # 使用上下文管理器自动管理连接
    async with MCPClient(url, headers, timeout, sse_read_timeout) as client:
        result = await client.call_tool(tool_name, tool_args)
        return result
