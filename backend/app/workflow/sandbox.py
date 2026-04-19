# workflow/sandbox.py
import shutil
from typing import List
import docker
import tempfile
import os
import asyncio
import uuid
from app.core.logging import logger
from app.core.config import settings  # 添加配置导入


class CodeSandbox:
    def __init__(self, image="python-sandbox:latest"):
        self.client = docker.from_env()
        self.image = image
        self.container = None
        # self.tmpdir = None  # 延迟初始化
        self.workspace_dir = None  # 使用固定工作目录
        self.failed = False

        # 从配置获取共享卷路径
        self.shared_volume = settings.sandbox_shared_volume
        os.makedirs(self.shared_volume, exist_ok=True)

    @classmethod
    async def get_all_images(cls) -> List[str]:
        """获取系统所有Docker镜像的标签列表"""
        loop = asyncio.get_event_loop()
        client = docker.from_env()
        # 在executor中运行同步的镜像列表获取
        images = await loop.run_in_executor(None, client.images.list)
        # 提取所有镜像标签
        return [tag for img in images for tag in img.tags]

    @classmethod
    async def delete_image(
        cls, image_ref: str, force: bool = False, noprune: bool = False
    ) -> dict:
        loop = asyncio.get_event_loop()
        client = docker.from_env()

        if image_ref == "python-sandbox:latest":
            return {
                "status": "error",
                "message": f"Error: Can not delete base image 'python-sandbox:latest'",
                "error_type": "DeleteBaseImage",
            }

        try:
            # 获取镜像对象
            image = await loop.run_in_executor(
                None, lambda: client.images.get(image_ref)
            )

            # 执行删除操作
            remove_result = await loop.run_in_executor(
                None, lambda: image.remove(force=force, noprune=noprune)
            )

            return {"status": "success", "deleted": image_ref, "details": remove_result}

        except docker.errors.ImageNotFound:
            return {
                "status": "error",
                "message": f"Image not found: {image_ref}",
                "error_type": "ImageNotFound",
            }

        except docker.errors.APIError as e:
            return {
                "status": "error",
                "message": f"Docker API Error: {str(e)}",
                "error_type": "APIError",
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Error: {str(e)}",
                "error_type": "UnexpectedError",
            }

    async def __aenter__(self):
        # 为当前会话创建唯一工作目录
        session_id = uuid.uuid4().hex
        self.workspace_dir = os.path.join(self.shared_volume, session_id)
        os.makedirs(self.workspace_dir, exist_ok=True)

        # 延迟创建临时目录
        # self.tmpdir = tempfile.TemporaryDirectory()
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    async def start(self):
        """启动长期运行的容器"""
        if self.container:
            return
        if self.image not in await self.get_all_images():
            logger.warning(f"找不到镜像{self.image},使用默认镜像")
            self.image = "python-sandbox:latest"

        loop = asyncio.get_event_loop()
        self.container = await loop.run_in_executor(
            None,
            lambda: self.client.containers.run(
                image=self.image,
                command="tail -f /dev/null",  # 保持容器运行
                detach=True,
                mem_limit="100m",
                cpu_period=100000,
                cpu_quota=50000,
                volumes={"daziknow_sandbox_volume": {"bind": "/shared", "mode": "rw"}},
                # volumes={self.tmpdir.name: {"bind": "/app", "mode": "rw"}},
                # network_mode="none",
                security_opt=["no-new-privileges"],
                user="restricted_user",
            ),
        )

    async def commit(self, repository: str, tag: str = "latest") -> str:
        """将当前容器提交为新的Docker镜像"""
        if not self.container:
            self.failed = True
            raise RuntimeError("No container to commit")

        loop = asyncio.get_event_loop()
        # 在executor中运行同步的commit操作
        image = await loop.run_in_executor(
            None,
            lambda: self.container.commit(
                repository=repository,
                tag=tag,
                # 可添加其他提交参数如message、author等
            ),
        )
        return f"{repository}:{tag}"

    async def execute(
        self,
        code: str,
        inputs: dict = None,
        pip: dict = None,
        image_url: str = "",
        remove: bool = False,
        timeout: int = 3600,
    ) -> dict:
        """在持久化容器中执行代码"""
        if not self.container:
            self.failed = True
            raise RuntimeError("No container running")

        # 生成唯一脚本文件名
        script_name = f"script_{uuid.uuid4().hex}.py"

        script_path = os.path.join(self.workspace_dir, script_name)
        # script_path = os.path.join(self.tmpdir.name, script_name)

        # 写入脚本文件
        with open(script_path, "w") as f:
            if inputs:
                for k, v in inputs.items():
                    v = repr(v) if v == "" else v
                    f.write(f"{k} = {v}\n")
            f.write(code + "\n")
            if inputs:
                f.write('print("####Global variable updated####")\n')
                for k in inputs:
                    f.write(f"if isinstance({k}, str):\n")
                    f.write(f'    print("{k} = ", repr({k}), sep="")\n')
                    f.write(f"else:\n")
                    f.write(f'    print("{k} = ", {k}, sep="")\n')

        # 容器内的脚本路径
        container_script_path = f"/shared/{os.path.basename(self.workspace_dir)}/{script_name}"

        # 构建完整命令链
        commands = []
        if pip:
            pip_cmd = self._generate_pip_command(pip, image_url, remove)
            commands.append(pip_cmd)
        if code:
            commands.append(f"python {container_script_path}")
            # commands.append(f"python /app/{script_name}")

        try:
            # 在容器内执行命令链
            exit_code, output = await self._exec_container(
                " && ".join(commands), timeout
            )
            if exit_code != 0:
                self.failed = True
                raise docker.errors.ContainerError(
                    self.container,
                    exit_code,
                    command=commands,
                    image=self.image,
                    stderr=output,
                )
            return {"result": output.strip()}
        except asyncio.TimeoutError:
            self.failed = True
            raise ValueError("Run timed out")

    async def _exec_container(self, command: str, timeout: int):
        """在运行中的容器执行命令"""
        loop = asyncio.get_event_loop()

        def _sync_exec():
            exec_id = self.container.exec_run(
                cmd=f"sh -c '{command}'", demux=True  # 分离stdout/stderr
            )
            return exec_id

        # 异步执行
        exit_code, (stdout, stderr) = await asyncio.wait_for(
            loop.run_in_executor(None, _sync_exec), timeout=timeout
        )

        # 处理输出
        output = []
        if stdout:
            output.append(stdout.decode())
        if stderr:
            output.append(stderr.decode())
        return exit_code, "\n".join(output)

    def _generate_pip_command(self, pip: dict, image_url: str, remove: bool) -> str:
        """生成pip安装/卸载命令"""
        if not pip:
            return ""

        base_cmd = "pip3 uninstall -y" if remove else "pip3 install"
        packages = []

        for package, version in pip.items():
            package = (
                package.replace(" ", "")
                .replace("&", "")
                .replace("\\", "")
                .replace("/", "")
            )
            if remove:
                packages.append(package)
            else:
                packages.append(f"{package}=={version}" if version else package)

        cmd = f"{base_cmd} {' '.join(packages)}"

        if image_url and not remove:
            cmd += f" -i {image_url}"

        return cmd + " --no-warn-script-location"

    async def close(self):
        """清理资源（由上下文管理器自动调用）"""
        try:
            if self.container:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None, lambda: self.container.remove(force=True)
                )
                self.container = None
        except (docker.errors.APIError, asyncio.TimeoutError) as e:
            logger.error(f"强制清理容器时发生错误: {str(e)}")
        finally:
            pass
            # 清理工作目录
            #if os.path.exists(self.workspace_dir):
            #    shutil.rmtree(self.workspace_dir)
            # if self.tmpdir:
            #     self.tmpdir.cleanup()


# async def run():
#     async with CodeSandbox() as sandbox:
#         # 首次执行（自动安装依赖）
#         result1 = await sandbox.execute(
#             code="",
#             pip={"requests": ""},
#             image_url="https://pypi.tuna.tsinghua.edu.cn/simple"
#         )

#         # 后续执行复用环境
#         result2 = await sandbox.execute(
#             code="import requests; print(requests.__version__)"
#         )
#         return result1,result2

# print(asyncio.run(run()))
