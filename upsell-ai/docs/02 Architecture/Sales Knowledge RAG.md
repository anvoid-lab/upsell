---
type: architecture
title: Sales Knowledge RAG
updated: 2026-09-25
related:
  - "[[01 Backlog/Phase 03 - Sales Reasoning and Knowledge Base]]"
  - "[[02 Architecture/Agent Boundaries]]"
  - "[[04 Decisions/ADR-002 Defer Durable Agent Execution Persistence]]"
---

# Sales Knowledge RAG

The MVP RAG indexes only the static sales knowledge under `knowledge-base/sales`.
Customer identity comes from `TenantContext`, and product data comes from
validated product tools. Neither comes from the Sales RAG index. Message media
is conversation input and is not a product-data source.

## ai_sales_knowledge

Each row is one ready-to-use chunk with its embedding.

```yaml
id: uuid
knowledge_id: text
source_path: text
title: text
document_type: text
chunk_index: integer
content: text
embedding: vector
content_hash: text
metadata: jsonb | null
created_at: timestamptz
updated_at: timestamptz
```

The static files remain the authoring source of truth. Indexing reads each file,
creates small chunks, generates embeddings, and stores the chunk text and vector
in `ai_sales_knowledge`. `content_hash` detects files that require reindexing.

Retrieval performs one vector query and receives the selected text directly from
the same rows. No file read is required during an agent run. Only the Sales Agent
can call this retrieval tool.

Tenant-specific document RAG through `ai_knowledge_documents` and
`ai_knowledge_chunks` is deferred. Future external business data is retrieved
through explicit tools instead of embeddings.
