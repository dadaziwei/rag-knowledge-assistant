# workflow/Code_scanner.py
import ast
from typing import Dict

class CodeScanner:
    FORBIDDEN_KEYWORDS = [
        'os.system', 'subprocess', 'eval', 'exec',
        'open', '__import__', 'socket'
    ]
    
    def scan_code(self, code: str) -> Dict:
        """执行静态代码分析"""
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            return {
                "safe": False,
                "issues": [f"语法错误: {str(e)}"]
            }
            
        issues = []
        
        # 检查危险函数调用
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func_name = ast.unparse(node.func)
                if any(kw in func_name for kw in self.FORBIDDEN_KEYWORDS):
                    issues.append(f"禁止的函数调用: {func_name}")
                    
            # 检查危险import
            if isinstance(node, ast.Import) or isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    if alias.name.split('.')[0] in ['os', 'subprocess', 'socket']:
                        issues.append(f"禁止的模块导入: {alias.name}")
        
        return {
            "safe": len(issues) == 0,
            "issues": issues
        }