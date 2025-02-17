# src/agents/security_agent.py
from typing import Dict, List
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate
from langchain.tools import tool
from ..tools.github_tools import GHASTools

class SecurityAgent:
    """Agent responsible for analyzing security issues and vulnerabilities."""
    
    def __init__(self, model, tools):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a security expert that analyzes GitHub code for vulnerabilities."),
            ("user", "{input}")
        ])
        self.tools = tools
        self.model = model
        self.agent = create_openai_functions_agent(model, tools, self.prompt)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=tools)

    async def analyze_security_issues(self, repo: str) -> List[Dict]:
        """Analyze security issues in a repository."""
        result = await self.agent_executor.arun(
            f"Analyze security issues in repository {repo}"
        )
        return result

    async def prioritize_vulnerabilities(self, issues: List[Dict]) -> List[Dict]:
        """Prioritize vulnerabilities based on severity and impact."""
        result = await self.agent_executor.arun(
            f"Prioritize these security issues: {issues}"
        )
        return result
