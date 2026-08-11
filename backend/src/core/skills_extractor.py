"""
Skills Extraction Engine
Extracts tech skills from job descriptions using keyword matching
against a curated taxonomy of ~200 skills.
"""

import re
from typing import List, Set

# ── Curated Skill Taxonomy ──────────────────────────────────────
# Organized by category for maintainability

SKILLS_TAXONOMY: dict[str, list[str]] = {
    "languages": [
        "Python", "JavaScript", "TypeScript", "Java", "Go", "Golang", "Rust",
        "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R",
        "Elixir", "Clojure", "Haskell", "Perl", "Lua", "Dart", "Objective-C",
        "MATLAB", "Julia", "Solidity", "SQL", "GraphQL", "HTML", "CSS",
        "Bash", "Shell", "PowerShell",
    ],
    "frontend": [
        "React", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit",
        "Remix", "Astro", "Gatsby", "jQuery", "Tailwind", "TailwindCSS",
        "Bootstrap", "Material UI", "Chakra UI", "Styled Components",
        "Redux", "Zustand", "MobX", "Webpack", "Vite", "Storybook",
    ],
    "backend": [
        "Node.js", "Express", "Fastify", "NestJS", "Django", "Flask",
        "FastAPI", "Spring", "Spring Boot", "Rails", "Ruby on Rails",
        "Laravel", "ASP.NET", ".NET", "Gin", "Echo", "Fiber",
        "gRPC", "REST", "RESTful", "WebSocket", "Microservices",
    ],
    "data": [
        "PostgreSQL", "Postgres", "MySQL", "MongoDB", "Redis", "Elasticsearch",
        "DynamoDB", "Cassandra", "CockroachDB", "Supabase", "Firebase",
        "SQLite", "Oracle", "SQL Server", "MariaDB", "Neo4j",
        "Snowflake", "BigQuery", "Redshift", "Databricks", "dbt",
        "Apache Spark", "Spark", "Kafka", "Airflow", "Flink",
        "Hadoop", "Hive", "Presto", "Trino", "ETL",
        "Data Warehouse", "Data Lake", "Data Pipeline",
    ],
    "ml_ai": [
        "Machine Learning", "Deep Learning", "NLP",
        "Natural Language Processing", "Computer Vision",
        "TensorFlow", "PyTorch", "Scikit-learn", "Keras", "Hugging Face",
        "LLM", "Large Language Model", "GPT", "Generative AI", "Gen AI",
        "Transformer", "BERT", "Reinforcement Learning",
        "Neural Network", "MLOps", "Feature Engineering",
        "Model Training", "Model Deployment", "A/B Testing",
        "Recommendation Systems", "RAG", "Vector Database",
        "LangChain", "OpenAI", "Anthropic",
    ],
    "cloud": [
        "AWS", "Amazon Web Services", "Azure", "Google Cloud", "GCP",
        "Heroku", "Vercel", "Netlify", "Cloudflare", "DigitalOcean",
        "S3", "EC2", "Lambda", "ECS", "EKS", "SQS", "SNS",
        "CloudFormation", "CDK",
    ],
    "devops": [
        "Docker", "Kubernetes", "K8s", "Terraform", "Ansible", "Pulumi",
        "CI/CD", "GitHub Actions", "GitLab CI", "Jenkins", "CircleCI",
        "ArgoCD", "Helm", "Prometheus", "Grafana", "Datadog",
        "New Relic", "PagerDuty", "Linux", "Nginx", "Apache",
        "Infrastructure as Code", "IaC", "SRE", "Site Reliability",
    ],
    "security": [
        "Cybersecurity", "Security", "OAuth", "SAML", "SSO",
        "Penetration Testing", "Pen Testing", "SOC", "SIEM",
        "Encryption", "Zero Trust", "IAM", "RBAC",
        "Compliance", "GDPR", "SOC 2", "HIPAA", "PCI",
    ],
    "tools": [
        "Git", "GitHub", "GitLab", "Bitbucket", "Jira", "Confluence",
        "Slack", "Figma", "Notion", "Linear", "Asana",
        "Postman", "Swagger", "OpenAPI",
    ],
    "mobile": [
        "React Native", "Flutter", "iOS", "Android",
        "SwiftUI", "Jetpack Compose", "Expo",
    ],
    "concepts": [
        "Agile", "Scrum", "System Design", "API Design",
        "Object-Oriented", "OOP", "Functional Programming",
        "Event-Driven", "Domain-Driven Design", "DDD",
        "Test-Driven Development", "TDD", "Unit Testing",
        "Integration Testing", "End-to-End Testing",
    ],
}

# Build a flat lookup: lowercase -> canonical name
_SKILL_LOOKUP: dict[str, str] = {}
_SKILL_PATTERNS: list[tuple[re.Pattern, str]] = []

for _category, _skills in SKILLS_TAXONOMY.items():
    for _skill in _skills:
        canonical = _skill
        key = _skill.lower()
        _SKILL_LOOKUP[key] = canonical

        # Build word-boundary regex for each skill
        # Escape special regex chars (C++, C#, .NET, etc.)
        escaped = re.escape(_skill)
        pattern = re.compile(r'(?<![a-zA-Z])' + escaped + r'(?![a-zA-Z])', re.IGNORECASE)
        _SKILL_PATTERNS.append((pattern, canonical))

# Sort by length descending so longer matches take precedence
# e.g., "React Native" before "React", "Machine Learning" before "Machine"
_SKILL_PATTERNS.sort(key=lambda x: len(x[1]), reverse=True)


def extract_skills(text: str) -> List[str]:
    """
    Extract tech skills from a job description text.
    Returns a deduplicated, sorted list of canonical skill names.
    """
    if not text:
        return []

    found: Set[str] = set()

    for pattern, canonical in _SKILL_PATTERNS:
        if pattern.search(text):
            found.add(canonical)

    # Normalize duplicates: if we found both "Golang" and "Go", keep "Go"
    normalizations = {
        "Golang": "Go",
        "Amazon Web Services": "AWS",
        "Google Cloud": "GCP",
        "K8s": "Kubernetes",
        "Postgres": "PostgreSQL",
        "Ruby on Rails": "Rails",
        "TailwindCSS": "Tailwind",
    }
    normalized: Set[str] = set()
    for skill in found:
        normalized.add(normalizations.get(skill, skill))

    return sorted(normalized)


# ── Role Category Detection ─────────────────────────────────────

ROLE_CATEGORIES = {
    "Software Engineer": [
        "software engineer", "software developer", "backend engineer",
        "frontend engineer", "full stack", "fullstack", "full-stack",
        "web developer", "application developer", "platform engineer",
    ],
    "Data Engineer": [
        "data engineer", "data infrastructure", "analytics engineer",
        "etl developer", "data pipeline",
    ],
    "Data Analyst": [
        "data analyst", "business analyst", "analytics analyst",
        "bi analyst", "business intelligence",
    ],
    "Data Scientist": [
        "data scientist", "research scientist", "applied scientist",
        "machine learning engineer", "ml engineer", "ai engineer",
        "ai/ml", "ml/ai",
    ],
    "DevOps / SRE": [
        "devops", "site reliability", "sre", "infrastructure engineer",
        "platform engineer", "cloud engineer",
    ],
    "Product Manager": [
        "product manager", "program manager", "technical program manager",
        "product owner",
    ],
    "Designer": [
        "product designer", "ux designer", "ui designer", "ux/ui",
        "design systems", "visual designer", "interaction designer",
    ],
    "QA / Testing": [
        "qa engineer", "quality assurance", "test engineer", "sdet",
        "automation engineer",
    ],
    "Security": [
        "security engineer", "cybersecurity", "application security",
        "infosec", "security analyst",
    ],
    "Mobile": [
        "mobile engineer", "ios engineer", "android engineer",
        "mobile developer", "react native developer", "flutter developer",
    ],
}


def detect_role_category(title: str) -> str | None:
    """Detect the role category from a job title."""
    if not title:
        return None
    title_lower = title.lower()
    for category, keywords in ROLE_CATEGORIES.items():
        for keyword in keywords:
            if keyword in title_lower:
                return category
    return None
