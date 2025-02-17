# src/workflows/security_workflow.py
from typing import Dict, List
from langgraph.graph import Graph
from langchain.agents import AgentExecutor

def create_security_workflow(
    security_agent: AgentExecutor,
    remediation_agent: AgentExecutor,
    review_agent: AgentExecutor
) -> Graph:
    """Create a workflow for security analysis and remediation."""
    
    workflow = Graph()

    @workflow.node
    async def analyze_security(state: Dict) -> Dict:
        """Analyze security issues in the repository."""
        issues = await security_agent.analyze_security_issues(state["repo"])
        state["security_issues"] = issues
        return state

    @workflow.node
    async def generate_fixes(state: Dict) -> Dict:
        """Generate fixes for identified security issues."""
        fixes = []
        for issue in state["security_issues"]:
            fix = await remediation_agent.generate_fix(issue)
            fixes.append(fix)
        state["proposed_fixes"] = fixes
        return state

    @workflow.node
    async def review_fixes(state: Dict) -> Dict:
        """Review and validate proposed fixes."""
        approved_fixes = []
        for fix in state["proposed_fixes"]:
            if await review_agent.validate_fix(fix):
                approved_fixes.append(fix)
        state["approved_fixes"] = approved_fixes
        return state

    # Define workflow
    workflow.add_node("analyze", analyze_security)
    workflow.add_node("generate", generate_fixes)
    workflow.add_node("review", review_fixes)

    # Define edges
    workflow.add_edge("analyze", "generate")
    workflow.add_edge("generate", "review")

    return workflow
