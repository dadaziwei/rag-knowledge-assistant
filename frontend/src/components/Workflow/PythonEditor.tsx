// components/PythonEditor.tsx
"use client";

import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { autocompletion, CompletionContext } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { useFlowStore } from "@/stores/flowStore";
import { CustomNode } from "@/types/types";

// Python 内置关键词和函数库
const pythonKeywords = [
  "and",
  "as",
  "assert",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "False",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "None",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "True",
  "try",
  "while",
  "with",
  "yield",
];

const pythonBuiltins = [
  "abs",
  "all",
  "any",
  "ascii",
  "bin",
  "bool",
  "bytearray",
  "bytes",
  "callable",
  "chr",
  "classmethod",
  "compile",
  "complex",
  "delattr",
  "dict",
  "dir",
  "divmod",
  "enumerate",
  "eval",
  "exec",
  "filter",
  "float",
  "format",
  "frozenset",
  "getattr",
  "globals",
  "hasattr",
  "hash",
  "help",
  "hex",
  "id",
  "input",
  "int",
  "isinstance",
  "issubclass",
  "iter",
  "len",
  "list",
  "locals",
  "map",
  "max",
  "memoryview",
  "min",
  "next",
  "object",
  "oct",
  "open",
  "ord",
  "pow",
  "print",
  "property",
  "range",
  "repr",
  "reversed",
  "round",
  "set",
  "setattr",
  "slice",
  "sorted",
  "staticmethod",
  "str",
  "sum",
  "super",
  "tuple",
  "type",
  "vars",
  "zip",
  "__import__",
];

// 获取当前文档中所有定义的标识符
function getDefinedIdentifiers(state: EditorState) {
  const identifiers = new Set<string>();
  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === "VariableName" || node.name === "FunctionDefinition") {
        const name = state.sliceDoc(node.from, node.to);
        identifiers.add(name);
      }
    },
  });
  return Array.from(identifiers);
}

// 智能提示逻辑
function pythonCompletion(context: CompletionContext) {
  const word = context.matchBefore(/\w*/);
  if (!word) return null;

  const currentPos = context.pos;
  const state = context.state;

  // 获取已定义的标识符
  const definedIds = getDefinedIdentifiers(state);

  // 组合所有建议
  const options = [
    ...pythonKeywords.map((label) => ({ label, type: "keyword" })),
    ...pythonBuiltins.map((label) => ({ label, type: "function" })),
    ...definedIds.map((label) => ({ label, type: "variable" })),
  ];

  return {
    from: word.from,
    options: options.filter(
      (opt) => opt.label.startsWith(word.text) && opt.label !== word.text
    ),
    validFor: /^\w*$/,
  };
}

interface PythonEditorProps {
  node:CustomNode;
}


const PythonEditor: React.FC<PythonEditorProps> = ({node}) => {
  const {updateCode} = useFlowStore()
  return (
    <CodeMirror
      value={node.data.code}
      height="100%"
      className="text-[15px]"
      extensions={[
        python(),
        autocompletion({
          override: [pythonCompletion],
          activateOnTyping: true,
        }),
      ]}
      theme="light"
      onChange={(value)=>updateCode(node.id, value)}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        tabSize: 4,
      }}
    />
  );
}

export default PythonEditor;