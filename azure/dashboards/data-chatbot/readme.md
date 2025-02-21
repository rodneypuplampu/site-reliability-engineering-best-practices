# Data Chat Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing a conversational interface for data analysis using LangChain, LangGraph, Weaviate, and vector search capabilities. The system enables natural language interactions with your data, providing intelligent responses and insights.

## Table of Contents
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Implementation Steps](#implementation-steps)
- [Usage](#usage)
- [Advanced Features](#advanced-features)
- [Troubleshooting](#troubleshooting)

## System Architecture

The system architecture is composed of several interconnected components:

<div class="mermaid">
graph TD
    subgraph User_Interface
        UI[Chat Interface] --> NLP[Natural Language Processing]
        NLP --> QP[Query Processing]
    end

    subgraph Vector_Search
        QP --> VS[Vector Store]
        VS --> WV[Weaviate]
        WV --> SR[Search Results]
    end

    subgraph LangChain_Processing
        SR --> LC[LangChain]
        LC --> PH[Prompt Handler]
        LC --> CH[Chain Handler]
        LC --> MH[Memory Handler]
    end

    subgraph LangGraph_Flow
        CH --> LG[LangGraph]
        LG --> FV[Flow Visualization]
        LG --> ST[State Tracking]
    end

    subgraph Response_Generation
        PH --> RG[Response Generator]
        MH --> RG
        RG --> UI
    end

    subgraph Data_Storage
        DS[Data Source] --> IP[Data Ingestion Pipeline]
        IP --> WV
        IP --> VE[Vector Embeddings]
        VE --> VS
    end
</div>

## Prerequisites

```bash
# Required Python version
Python 3.9+

# Required packages
langchain>=0.1.0
langgraph>=0.1.0
weaviate-client>=3.24.1
openai>=1.0.0
python-dotenv>=1.0.0
streamlit>=1.28.0
```

## Installation

1. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

2. Install required packages:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys and configurations
```

## Implementation Steps

### Step 1: Set Up Weaviate Vector Database

1. Initialize Weaviate client:
```python
import weaviate
from weaviate.embedded import EmbeddedOptions

client = weaviate.Client(
    embedded_options=EmbeddedOptions(),
    additional_headers={
        "X-OpenAI-Api-Key": os.getenv("OPENAI_API_KEY")
    }
)
```

2. Create schema:
```python
class_obj = {
    "class": "DataDocument",
    "vectorizer": "text2vec-openai",
    "moduleConfig": {
        "text2vec-openai": {
            "model": "ada-002",
            "modelVersion": "002",
            "type": "text"
        }
    },
    "properties": [
        {
            "name": "content",
            "dataType": ["text"],
            "moduleConfig": {
                "text2vec-openai": {
                    "skip": False,
                    "vectorizePropertyName": False
                }
            }
        },
        {
            "name": "metadata",
            "dataType": ["object"],
            "moduleConfig": {
                "text2vec-openai": {
                    "skip": True
                }
            }
        }
    ]
}

client.schema.create_class(class_obj)
```

### Step 2: Implement Data Ingestion Pipeline

1. Create data processor:
```python
class DataProcessor:
    def __init__(self, client):
        self.client = client
        
    def process_document(self, content, metadata=None):
        # Create document object
        data_object = {
            "content": content,
            "metadata": metadata or {}
        }
        
        # Add to Weaviate
        return self.client.data_object.create(
            data_object,
            "DataDocument"
        )
```

2. Implement batch processing:
```python
def batch_process_documents(documents, batch_size=100):
    processor = DataProcessor(client)
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        with client.batch as batch_processor:
            for doc in batch:
                processor.process_document(
                    doc['content'],
                    doc.get('metadata')
                )
```

### Step 3: Set Up LangChain Components

1. Create vector store retriever:
```python
from langchain.vectorstores import Weaviate
from langchain.embeddings import OpenAIEmbeddings

embeddings = OpenAIEmbeddings()
vector_store = Weaviate(
    client,
    "DataDocument",
    "content",
    embeddings=embeddings
)
```

2. Define conversation chain:
```python
from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import ChatOpenAI

llm = ChatOpenAI(temperature=0)
chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(),
    return_source_documents=True
)
```

### Step 4: Implement LangGraph Flow

1. Create graph nodes:
```python
from langgraph.graph import Graph
from langgraph.prebuilt import ToolExecutor

def query_processor(state):
    query = state['query']
    context = state.get('context', [])
    response = chain({
        "question": query,
        "chat_history": context
    })
    return {"response": response}

# Create graph
graph = Graph()
graph.add_node("process_query", query_processor)
```

2. Define graph edges:
```python
# Add edges
graph.add_edge("input", "process_query")
graph.add_edge("process_query", "output")

# Compile graph
chain = graph.compile()
```

### Step 5: Create Chat Interface

1. Set up Streamlit interface:
```python
import streamlit as st

def main():
    st.title("Data Chat Interface")
    
    # Initialize session state
    if "messages" not in st.session_state:
        st.session_state.messages = []
    
    # Display chat messages
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Get user input
    if prompt := st.chat_input("What would you like to know about the data?"):
        # Add user message to chat history
        st.session_state.messages.append({
            "role": "user",
            "content": prompt
        })
        
        # Get response from chain
        response = chain.run(prompt)
        
        # Add assistant response to chat history
        st.session_state.messages.append({
            "role": "assistant",
            "content": response
        })

if __name__ == "__main__":
    main()
```

## Usage

1. Start the application:
```bash
streamlit run app.py
```

2. Interact with your data:
```python
# Example queries
"What are the key trends in the sales data?"
"Can you summarize the customer feedback from last month?"
"Show me the top performing products by revenue."
```

## Advanced Features

### 1. Implement Memory Management

```python
from langchain.memory import ConversationBufferMemory

memory = ConversationBufferMemory(
    memory_key="chat_history",
    return_messages=True
)

chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(),
    memory=memory
)
```

### 2. Add Custom Tools

```python
from langchain.tools import Tool

def analyze_data(query):
    # Implement custom data analysis logic
    pass

tools = [
    Tool(
        name="data_analysis",
        func=analyze_data,
        description="Analyze data based on specific criteria"
    )
]

chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(),
    tools=tools
)
```

### 3. Implement Error Handling

```python
class ChatError(Exception):
    pass

def safe_chat_response(query):
    try:
        return chain.run(query)
    except Exception as e:
        raise ChatError(f"Error processing query: {str(e)}")
```

## Troubleshooting

### Common Issues

1. Vector Store Connection:
```python
def check_vector_store():
    try:
        client.is_ready()
        return "Vector store is connected"
    except Exception as e:
        return f"Vector store connection error: {str(e)}"
```

2. Memory Usage:
```python
def monitor_memory():
    return {
        "total_messages": len(memory.chat_memory.messages),
        "memory_size": sys.getsizeof(memory.chat_memory)
    }
```

## Directory Structure
```
data-chat/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   └── utils.py
├── components/
│   ├── processor.py
│   ├── chain.py
│   └── graph.py
├── interface/
│   └── streamlit_app.py
├── tests/
│   ├── test_processor.py
│   └── test_chain.py
├── requirements.txt
└── README.md
```

## Contributing
Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
