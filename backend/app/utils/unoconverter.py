import random
import xmlrpc.client
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List
from app.core.logging import logger
from app.core.config import settings
import os


class UnoConverter:
    _executor = ThreadPoolExecutor(max_workers=settings.unoserver_instances)

    def __init__(self, host: str, ports: List[int]):
        self.host = host
        self.ports = ports
        logger.info(f"Initialized UnoConverter with host {host} and ports {ports}")

    def _get_random_server(self) -> str:
        """随机选择一个可用服务实例"""
        port = random.choice(self.ports)
        return f"http://{self.host}:{port}"

    def convert(
        self,
        file_content: bytes,
        output_format: str = "pdf",
        input_format: str = None,
        filtername: str = None,
        filter_options: list = [],
        update_index: bool = True,
        infiltername: str = None,
    ) -> bytes:
        """同步转换方法"""
        server_url = self._get_random_server()
        logger.debug(f"Using unoserver at {server_url}")

        try:
            with xmlrpc.client.ServerProxy(server_url, allow_none=True) as proxy:
                result = proxy.convert(
                    None,  # inpath (不使用文件路径)
                    xmlrpc.client.Binary(file_content),  # indata (二进制内容)
                    None,  # outpath (返回数据而不是保存到文件)
                    output_format,  # convert_to
                    filtername,
                    filter_options,
                    update_index,
                    infiltername,
                )

                if not result.data:
                    raise ValueError("Received empty conversion result")

                return result.data
        except xmlrpc.client.Fault as e:
            logger.error(f"XML-RPC fault during conversion: {e.faultString}")
            raise RuntimeError(f"Document conversion error: {e.faultString}")
        except Exception as e:
            logger.error(f"Unexpected conversion error: {str(e)}", exc_info=True)
            raise RuntimeError(f"Document conversion failed: {str(e)}")

    async def async_convert(
        self,
        file_content: bytes,
        output_format: str = "pdf",
        input_format: str = None,
        filter_options: dict = None,
    ) -> bytes:
        """异步转换方法"""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            self._executor,
            self.convert,
            file_content,
            output_format,
            input_format,
            filter_options,
        )


# 全局转换器实例
unoconverter = UnoConverter(
    host=settings.unoserver_host,
    ports=[
        p
        for p in [
            int(settings.unoserver_base_port) + i
            for i in range(int(settings.unoserver_instances))
        ]
    ],
)
