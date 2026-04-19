import { ConversationBlock, Message, PathCalculationContext } from "@/types/types";

// 计算对话默认分支选择
export const calculateDefaultBranches = (
  conversationBlocks: ConversationBlock[]
): Record<string, number> => {
  if (conversationBlocks.length === 0) return {};
  
  const lastBlock = conversationBlocks[conversationBlocks.length - 1];
  const selectedIndexs: Record<string, number> = {};
  
  let currentBlock: ConversationBlock | undefined = lastBlock;
  
  // 逆向回溯 parentId，构造默认最新 path 的 selectedBrancheIndexs
  while (currentBlock) {
    const siblings = conversationBlocks.filter(
      block => (block.parentId ?? "root") === (currentBlock!.parentId ?? "root")
    );
    
    const branchIndex = siblings.findIndex(block => block === currentBlock);
    selectedIndexs[currentBlock.parentId ?? "root"] = branchIndex;
    
    // 找到上一个 parentId 的块
    currentBlock = currentBlock.parentId
      ? conversationBlocks.find(
          block => block.aiMessages[0]?.messageId === currentBlock?.parentId
        )
      : undefined;
  }
  
  return selectedIndexs;
};

// 计算对话当前分支的选择路径
export const calculateCurrentPath = (
  conversationBlocks: ConversationBlock[],
  selectedBranches: Record<string, number>,
): ConversationBlock[] => {

  // 正常路径需重新计算
  const path: ConversationBlock[] = [];
  let currentParentId: string | undefined = "root";
  
  while (currentParentId !== undefined) {
    const siblings = conversationBlocks.filter(
      block => (block.parentId ?? "root") === currentParentId
    );
    
    if (siblings.length === 0) break;
    
    const selectedIndex = selectedBranches[currentParentId] ?? siblings.length - 1;
    // 确保索引在有效范围内
    const safeIndex = Math.min(Math.max(selectedIndex, 0), siblings.length - 1);
    const selectedBlock = siblings[safeIndex];
    
    path.push(selectedBlock);
    
    currentParentId = selectedBlock.aiMessages.length > 0
      ? selectedBlock.aiMessages[selectedBlock.aiMessages.length - 1].messageId
      : undefined;
  }
  
  return path;
};

// 构建对话块Tree
export const buildConversationBlocks = (
  rawMessages: Message[],
  prevBlocks: ConversationBlock[],
  prevReceivingLength: number,
  isReceiving: boolean
): ConversationBlock[] => {
  // 如果sse消息长度没变，且有缓存，则只更新最后一个 block 的 aiMessages
  if (
    isReceiving &&
    prevReceivingLength === rawMessages.length &&
    prevBlocks.length > 0 &&
    rawMessages.length > 0
  ) {
    // 找到最后一个 user 消息
    const lastUserMsg = [...rawMessages]
      .reverse()
      .find((msg) => msg.from === "user");
    if (lastUserMsg) {
      const lastBlock = prevBlocks[prevBlocks.length - 1];
      if (lastBlock.userMessage.messageId === lastUserMsg.messageId) {
        // 更新最后一个 block 的 aiMessages
        let newAiMessages: Message[] = [];
        // 使用 findLastIndex 查找最后一个 user 的索引
        const lastUserIndex = rawMessages.findLastIndex(
          (msg) => msg.from === "user"
        );

        // 如果找到 user 且不在最后位置
        if (lastUserIndex !== -1 && lastUserIndex < rawMessages.length - 1) {
          newAiMessages = rawMessages.slice(lastUserIndex + 1);
        }

        const newBlocks = [...prevBlocks];
        newBlocks[prevBlocks.length - 1] = {
          ...newBlocks[prevBlocks.length - 1],
          aiMessages: newAiMessages,
        };
        return newBlocks;
      }
    }
    return prevBlocks;
  }

  // Building new conversation blocks
  const blocks: ConversationBlock[] = [];
  let currentUserMessage: Message | null = null;
  let otherUserMessage: Message[] = [];
  let currentAiMessages: Message[] = [];

  rawMessages.forEach((msg) => {
    if (msg.from === "user") {
      if (currentUserMessage) {
        blocks.push({
          userMessage: currentUserMessage,
          otherUserMessage: otherUserMessage,
          aiMessages: currentAiMessages,
          parentId: currentUserMessage.parentMessageId!,
          branchIndex: 0,
          branchCount: 1,
        });
        otherUserMessage = [];
      }
      if (msg.type === "text") {
        currentUserMessage = { ...msg };
      } else {
        currentUserMessage = null;
        otherUserMessage.push(msg);
      }
      currentAiMessages = [];
    } else if (msg.from === "ai" && currentUserMessage) {
      currentAiMessages.push(msg);
    }
  });

  if (currentUserMessage) {
    blocks.push({
      userMessage: currentUserMessage,
      otherUserMessage: otherUserMessage,
      aiMessages: currentAiMessages,
      parentId: (currentUserMessage as Message).parentMessageId!,
      branchIndex: 0,
      branchCount: 1,
    });
  }

  // 按父节点分组
  const blocksByParent: Record<string, ConversationBlock[]> = {};
  blocks.forEach((block) => {
    const parentId = block.parentId ?? "root";
    if (!blocksByParent[parentId]) {
      blocksByParent[parentId] = [];
    }
    blocksByParent[parentId].push(block);
  });

  // 计算分支信息
  Object.keys(blocksByParent).forEach((parentId) => {
    const siblings = blocksByParent[parentId];
    const branchCount = siblings.length;
    siblings.sort(
      (a, b) =>
        rawMessages.indexOf(a.userMessage) -
        rawMessages.indexOf(b.userMessage)
    );
    siblings.forEach((block, index) => {
      block.branchIndex = index;
      block.branchCount = branchCount;
    });
  });
  
  return blocks;
}