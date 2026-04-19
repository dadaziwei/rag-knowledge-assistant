---
sidebar_position: 3
---

# RAG-Chat

Our advanced **vision-based multimodal RAG-Chat system** enables **AI-powered conversations** with flexible knowledge integration. Choose from these interaction modes:

- Standard conversations without RAG
- RAG-enabled conversations using single or multiple knowledge bases
- Instant RAG conversations with uploaded files
- Hybrid mode combining document uploads with knowledge base retrieval

---

Before proceeding, ensure you've configured your preferred LLM and knowledge base by clicking the **Config Now** button in the center-right section.

## Configuring Knowledge Base and LLM

Click the **Config Now** button (center-right section) to access the Knowledge Base Configuration panel.  
![Knowledge Base Configuration - Config Now](./img/Knowledge-Base-Config-Now.png)

### 1. Configuration Panel - Upper Section

![Knowledge Base Configuration - Upper Section](./img/Knowledge-Base-Configuration-Upper-Section.png)

**Add Knowledge-Base**

- Redirects to the knowledge base management interface (refer to previous tutorial section)

**LLM Settings Section**:

- **LLM Engine**: Select your preferred large language model
- **Add New Configuration**: Create custom LLM configurations (supports OpenAI-compatible APIs)
- **LLM Url**: Endpoint URL for OpenAI-compatible APIs
- **API Key**: Your LLM service authentication key

**Knowledge Base Selection**:

- Multi-select knowledge bases using checkboxes

:::important LOCAL DEPLOYMENT NOTE  
**When using locally hosted models:**

1. The **API Key** field accepts any placeholder text.
2. Set the LLM URL to your machine's **Internal IP Address** (e.g., `http://192.168.1.5:8000` or `http://10.0.0.2:5000`) instead of `localhost`.
3. **Firewall Configuration:** If using a firewall (e.g., `ufw`), allow Docker network access to your LLM port.
4. **Service Binding:** Ensure your LLM service **binds to `0.0.0.0`** (all interfaces) instead of `127.0.0.1` (localhost only).
:::

:::tip SYSTEM REQUIREMENT  
DaziKnow's vision-based multimodal RAG system requires your LLM to support visual inputs (VLM capability) for full RAG functionality.  
:::

### 2. Configuration Panel - Lower Section

![Knowledge Base Configuration - Lower Section](./img/Knowledge-Base-Configuration-Lower-Section.png)

**System Prompt**:

- Contains the LLM's system instructions (Pro Tip: Well-crafted prompts significantly improve response quality)

**Advanced Settings**:

- **Use Model Default**: Applies default server-side configurations
  - LLM: Preserves original model parameters
  - RAG: Defaults to Top-K=3 and Score Threshold=10
- **Temperature** (0-1): Controls response creativity
- **Max Token** (1024-1048576): Response length limit
- **Top-P** (0-1): Probability mass sampling parameter
- **Knowledge-Base Top-K** (1-30): Quantity of retrieved images
- **Retrieval Score Threshold** (0-20): Minimum relevance score

:::tip RECOMMENDATIONS  
**For Beginners**:

- Default settings provide optimal balance for most use cases
- Each +1 in **Top-K** adds ~1000 tokens - adjust according to your compute resources
- Recommended **Top-K** values: 10 (resource-rich) or 3 (resource-constrained)

**For Learners**:

- Consult your LLM to understand each advanced parameter's effect through interactive Q&A  
  :::

---

## Chat Interface

After configuring and saving your LLM and knowledge base settings, you're ready to start conversations. The current LLM and selected knowledge bases will be displayed below the **Config Now** button.

![Chat Interface](./img/chat-interface.png)

DaziKnow supports the following conversation modes with identical user experience:

### Standard Chat (No RAG)

When no files are uploaded and no knowledge bases selected:

- Pure LLM conversation
- No knowledge base integration
- Fastest response time

![Standard Chat](./img/standard-chat.png)

### RAG Mode

1. **Single Knowledge Base**:
   When selecting one knowledge base:

   - Retrieves from one selected source
   - Best for focused topics

2. **Multiple Knowledge Bases**:
   When selecting multiple knowledge bases:

   - Combine information from several sources
   - Enable by checking multiple Knowledge Bases in sidebar

3. **Temporary Files**:
   When uploading files:

   - Use uploaded files just for current chat
   - Doesn't affect permanent knowledge bases

4. **Hybrid Mode (Files + Knowledge Bases)**:
   When uploading files AND selecting knowledge bases:
   - Combines temporary files with permanent knowledge bases
   - Provides most comprehensive context

![Response Example](./img/response-example.png)

The chat interface displays the current LLM and called knowledge bases above each response.

---

![Citation Example](./img/citation-example.png)

Responses include token usage statistics and RAG citations at the end, sorted by relevance with:

- Relevance score
- Document source
- Knowledge base origin

**Token Usage Breakdown**:

- Total token usage
- Completion token usage
- Prompt token usage

:::important NOTE
DaziKnow applies score threshold filtering to both uploaded files and knowledge base retrievals. Only content scoring above the threshold will be recalled.

To analyze complete documents:

1. Set score threshold to 0
2. Ensure Top-K exceeds document page count
   :::

---

## Conversation History

Access previous conversations via the left sidebar:

- Click conversations to view history
- Click the three-dot menu to rename or delete conversations

![History Interface](./img/history-interface.png)

:::danger WARNING
Deleted conversations cannot be recovered.
:::

---

## Next Steps

Explore DaziKnow's most powerful feature - **Agent Workflow Orchestration** with visual RAG capabilities.
