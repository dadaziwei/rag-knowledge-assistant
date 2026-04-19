// src/utils/imageLoader.ts

// 环境变量配置
const MINIO_INTERNAL_URL = `${process.env.MINIO_URL}`;
const PUBLIC_MINIO_URL_PREFIX = `${process.env.MINIO_IMAGE_URL_PREFIX}`;

const imageLoader = ({
  src,
  width,
  quality = 75,
}: {
  src: string;
  width: number;
  quality?: number;
}): string => {
  // 1. 将公共URL转换为MinIO内部URL
  let internalUrl = src;

  // 替换公共域名前缀为内部MinIO地址
  if (src.startsWith(PUBLIC_MINIO_URL_PREFIX)) {
    internalUrl = src.replace(PUBLIC_MINIO_URL_PREFIX, MINIO_INTERNAL_URL);

    // 2. 处理特殊字符问题（可选）
    // 如果MinIO服务器对编码敏感，可以取消注释以下行
    // internalUrl = decodeURIComponent(internalUrl);

    // 3. 添加图片优化参数
    const url = new URL(internalUrl);
    url.searchParams.append("w", width.toString());
    url.searchParams.append("q", quality.toString());

    return url.toString();
  } else {
    return internalUrl;
  }
};

export default imageLoader;
