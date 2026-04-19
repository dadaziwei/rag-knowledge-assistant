FROM apache/kafka:latest

# 复制初始化脚本
COPY init-kafka.sh /init-kafka.sh

USER root

# 设置脚本执行权限
RUN chmod +x /init-kafka.sh

# 设置容器启动时执行的命令
ENTRYPOINT ["/init-kafka.sh"]
