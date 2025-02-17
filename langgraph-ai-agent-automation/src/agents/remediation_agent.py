# src/agents/remediation_agent.py
from typing import Dict, List
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate

class RemediationAgent:
    """Agent responsible for generating and implementing security fixes."""
    
    def __init__(self, model, tools):
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a security expert that generates fixes for code vulnerabilities."),
            ("user", "{input}")
        ])
        self.tools = tools
        self.model = model
        self.agent = create_openai_functions_agent(model, tools, self.prompt)
        self.agent_executor = AgentExecutor(agent=self.agent, tools=tools)

    async def generate_fix(self, vulnerability: Dict) -> Dict:
        """Generate a fix for a specific vulnerability."""
        result = await self.agent_executor.arun(
            f"Generate a fix for this vulnerability: {vulnerability}"
        )
        return result

    async def validate_fix(self, fix: Dict) -> bool:
        """Validate a proposed security fix."""
        result = await self.agent_executor.arun(
            f"Validate this security fix: {fix}"
        )
        return result

# src/tools/github_tools.py
from typing import Dict, List
from langchain.tools import BaseTool
from github import Github

class GHASTools(BaseTool):
    """Tools for interacting with GitHub Advanced Security."""
    
    def __init__(self, github_token: str):
        self.github = Github(github_token)

    @tool
    def get_code_scanning_alerts(self, repo: str) -> List[Dict]:
        """Get code scanning alerts from GHAS."""
        repository = self.github.get_repo(repo)
        alerts = repository.get_code_scanning_alerts()
        return [
            {
                "id": alert.number,
                "state": alert.state,
                "severity": alert.rule.severity,
                "description": alert.rule.description,
                "location": alert.most_recent_instance.location.path
            }
            for alert in alerts
        ]

    @tool
    def get_dependency_alerts(self, repo: str) -> List[Dict]:
        """Get dependency scanning alerts from GHAS."""
        repository = self.github.get_repo(repo)
        alerts = repository.get_vulnerability_alert()
        return [
            {
                "id": alert.id,
                "severity": alert.severity,
                "package": alert.dependency.package.name,
                "version": alert.dependency.vulnerable_version_range
            }
            for alert in alerts
        ]
