export const getFileIcon = (fileExtension?: string) => {
  if (!fileExtension) return "📁";
  
  // 统一处理：移除开头的点，转换为小写
  const ext = fileExtension.replace(/^\./, '').toLowerCase();

  switch (ext) {
    // 图片类型
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'webp':
    case 'svg':
    case 'ico':
    case 'tiff':
    case 'tif':
    case 'dib':
    case 'jfif':
    case 'pjpeg':
    case 'pjp':
      return "🖼️";

    // PDF文档
    case 'pdf':
      return "📄";

    // Word文档
    case 'doc':
    case 'docx':
      return "📝";

    // PowerPoint文档
    case 'ppt':
    case 'pptx':
      return "📊";

    // Excel文档
    case 'xls':
    case 'xlsx':
      return "📈";

    // 文本文件
    case 'txt':
    case 'md':
    case 'rtf':
      return "📃";

    // 压缩文件
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return "📦";

    // 代码文件
    case 'js':
    case 'ts':
    case 'jsx':
    case 'tsx':
      return "📜";
    case 'html':
    case 'htm':
      return "🌐";
    case 'css':
      return "🎨";
    case 'json':
      return "📋";

    // 音视频文件
    case 'mp3':
    case 'wav':
    case 'flac':
      return "🎵";
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return "🎬";

    // 默认文件图标
    default:
      return "📄";
  }
};

export const getFileExtension = (filename: string) => {
  return filename.split(".").pop()?.toLowerCase() || "";
};

export const base64Processor = {
  pattern: /data:image\/([a-z0-9+.-]+);base64,/gi,
  placeholder: "__BASE64_IMAGE_$1_PLACEHOLDER__",

  encode: function (str: string) {
    return str.replace(this.pattern, (match, subtype) => {
      return this.placeholder.replace("$1", subtype);
    });
  },

  decode: function (str: string) {
    // 分割占位符并转义静态部分
    const parts = this.placeholder.split(/\$1/g);
    const escapedParts = parts.map((part) =>
      part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    // 拼接成完整正则表达式
    const regexStr = escapedParts.join("([a-z0-9+.-]+)");
    const reversePattern = new RegExp(regexStr, "gi");

    return str.replace(reversePattern, (full, subtype) => {
      return `data:image/${subtype};base64,`;
    });
  },
};

export const SupportUploadFormat = 
  ".jpg,.jpeg,.png,.gif,.bmp,.webp,.ico,.tiff,.tif,.dib,.jfif,.pjpeg,.pjp,.odm,.sgl,.odt,.ott,.sxw,.stw,.fodt,.xml,.docx,.docm,.dotx,.dotm,.doc,.dot,.wps,.pdb,.pdf,.hwp,.html,.htm,.lwp,.psw,.rft,.sdw,.vor,.txt,.wpd,.oth,.ods,.ots,.sxc,.stc,.fods,.xml,.xlsx,.xlsm,.xltm,.xltx,.xlsb,.xls,.xlc,.xlm,.xlw,.xlk,.sdc,.vor,.dif,.wk1,.wks,.123,.pxl,.wb2,.csv,.odp,.otp,.sti,.sxd,.fodp,.xml,.pptx,.pptm,.ppsx,.potm,.potx,.ppt,.pps,.pot,.sdd,.vor,.sdp,.odg,.otg,.sxd,.std,.sgv,.sda,.vor,.sdd,.cdr,.svg,.vsd,.vst,.html,.htm,.stw,.sxg,.odf,.sxm,.smf,.mml,.odb";
  export const SupportFileFormat = 
  ["jpg","jpeg","png","gif","bmp","webp","ico","tiff", "tif", "dib", "jfif", "pjpeg", "pjp","odm","sgl","odt","ott","sxw","stw","fodt","xml","docx","docm","dotx","dotm","doc","dot","wps","pdb","pdf","hwp","html","htm","lwp","psw","rft","sdw","vor","txt","wpd","oth","ods","ots","sxc","stc","fods","xml","xlsx","xlsm","xltm","xltx","xlsb","xls","xlc","xlm","xlw","xlk","sdc","vor","dif","wk1","wks","123","pxl","wb2","csv","odp","otp","sti","sxd","fodp","xml","pptx","pptm","ppsx","potm","potx","ppt","pps","pot","sdd","vor","sdp","odg","otg","sxd","std","sgv","sda","vor","sdd","cdr","svg","vsd","vst","html","htm","stw","sxg","odf","sxm","smf","mml","odb"]