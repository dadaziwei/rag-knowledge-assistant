FROM debian:bookworm-slim

ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG ALL_PROXY
ARG NO_PROXY

ENV TZ=Asia/Shanghai
ENV DEBIAN_FRONTEND=noninteractive
RUN export http_proxy="$HTTP_PROXY" https_proxy="$HTTPS_PROXY" all_proxy="$ALL_PROXY" no_proxy="$NO_PROXY" && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN echo "deb http://mirrors.aliyun.com/debian bookworm main non-free non-free-firmware" > /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian bookworm-updates main non-free non-free-firmware" >> /etc/apt/sources.list && \
    echo "deb http://mirrors.aliyun.com/debian bookworm-backports main non-free non-free-firmware" >> /etc/apt/sources.list

RUN rm -rf /etc/apt/sources.list.d/*

RUN unset HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY http_proxy https_proxy all_proxy no_proxy && \
    apt-get update -o Acquire::Retries=5 -o Acquire::Check-Valid-Until=false && \
    apt-get install -y --no-install-recommends --fix-missing \
        libreoffice-core \
        libreoffice-writer \
        libreoffice-calc \
        libreoffice-impress \
        libreoffice-draw \
        python3-uno \
        python3-pip \
        netcat-openbsd \
        ttf-wqy-zenhei \
        ttf-wqy-microhei \
        fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

RUN export http_proxy="$HTTP_PROXY" https_proxy="$HTTPS_PROXY" all_proxy="$ALL_PROXY" no_proxy="$NO_PROXY" && \
    python3 -m pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple unoserver --break-system-packages

COPY start_unoservers.sh /app/
RUN chmod +x /app/start_unoservers.sh

WORKDIR /app
CMD ["/app/start_unoservers.sh"]
