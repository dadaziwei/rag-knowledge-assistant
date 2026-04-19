export function replaceTemplate(str: string, obj: Record<string, any>): string {
  // 先处理模板变量替换
  const replaced = str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) return match;
    const value = obj[key];
    // 如果是字符串类型，尝试去除外层引号
    const processedValue = typeof value === "string" ? unquote(value) : value;
    return String(processedValue);
  });

  return replaced;
}

function safeUnicodeUnescape(s: string): string {
  // 定义转义映射表
  const escapeMap: Record<string, string> = {
    "\\n": "\n",
    "\\t": "\t",
    "\\r": "\r",
    "\\\\": "\\",
  };

  // 使用正则表达式一次性替换所有定义好的转义序列
  const regex = /\\[ntr\\]/g;
  return s.replace(regex, (match) => escapeMap[match] || match);
}

// 辅助函数：去除字符串外层匹配的引号
export function unquote(str: string): string {
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    return safeUnicodeUnescape(str.slice(1, -1));
  }
  return safeUnicodeUnescape(str);
}
