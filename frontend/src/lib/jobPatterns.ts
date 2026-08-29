/**
 * Canonical Single Source of Truth for Tech & Corporate Job Patterns,
 * Role Mappings, Skill Colors, and Taxonomy in JobPulse.
 */

// ── Strict Supported Job Function Title Patterns ────────────────────────────
export const RELEVANT_TITLE_PATTERNS = [
  // Software Engineering
  '*Software Engineer*', '*Software Developer*', '*Full Stack*', '*Fullstack*', '*Full-Stack*',
  '*Backend*', '*Back End*', '*Back-End*', '*Frontend*', '*Front End*', '*Front-End*',
  '*Web Developer*', '*Python Developer*', '*Python Engineer*', '*Java Developer*', '*Java Engineer*',
  '*C++*', '*C/C++*', '*.NET Developer*', '*.NET Engineer*', '*Dotnet*', '*C# Developer*', '*C# Engineer*',
  '*Systems Engineer*', '*System Engineer*', '*DevOps*', '*Platform Engineer*', '*Infrastructure Engineer*',
  '*Mobile Developer*', '*Mobile Engineer*', '*iOS Developer*', '*iOS Engineer*', '*Android Developer*', '*Android Engineer*',
  '*React Native*', '*Flutter*', '*QA Engineer*', '*Quality Assurance Engineer*', '*SDET*', '*Test Automation*', '*Automation Engineer*',
  '*Rust Developer*', '*Rust Engineer*', '*Golang*', '*Go Developer*', '*Go Engineer*',
  '*Firmware Engineer*', '*Embedded Software*', '*Embedded Engineer*',

  // Data & AI / ML
  '*Data Analyst*', '*Data Analytics*', '*BI Analyst*', '*Business Intelligence Analyst*',
  '*Data Scientist*', '*Data Science*', '*Applied Scientist*', '*Decision Scientist*',
  '*Data Engineer*', '*Data Platform*', '*ETL Developer*', '*Data Warehouse*',
  '*Machine Learning*', 'ML *', '* ML *', '* ML/*', '* ML-*', '* (ML)*', '* ML', '*MLOps*', '*Deep Learning*',
  'AI *', '* AI *', '* AI/*', '* AI-*', '* (AI)*', '* AI', '*Artificial Intelligence*',
  '*Generative AI*', '*GenAI*', '*Gen AI*', '*LLM*', '*NLP*', '*Computer Vision*', '*Prompt Engineer*', '*AI Agent*',

  // Cybersecurity & Cloud
  '*Cyber Security*', '*Cybersecurity*', '*Cloud Security*', '*Network Security*',
  '*Security Engineer*', '*Security Analyst*', '*Security Architect*', '*Information Security*',
  '*Infosec*', '*AppSec*', '*Application Security*', '*DevSecOps*', '*SOC Analyst*', '*Penetration Tester*',
  '*Cloud Architect*', '*Cloud Engineer*', '*AWS Engineer*', '*Azure Engineer*', '*GCP Engineer*',
  '*Site Reliability*', 'SRE *', '* SRE *', '* SRE',

  // Product & Design
  '*Product Manager*', '*Technical Program Manager*', 'TPM *', '* TPM *', '* TPM',
  '*Product Designer*', '*UI/UX*', '*UI Designer*', '*UX Designer*', '*UX Researcher*',
  '*User Experience*', '*User Interface*', '*Interaction Designer*', '*Design Systems*',
  '*Scrum Master*', '*Agile Coach*',

  // Business & Tech Ops
  '*Account Executive*', '*Sales Development Representative*', '*Sales Development Rep*', '*SDR *', '* SDR *', '* SDR',
  '*Business Development Representative*', '*BDR *', '* BDR *', '* BDR', '*Enterprise Sales*',
  '*Growth Marketing*', '*Product Marketing*', '*Marketing Specialist*', '*Digital Marketing*',
  '*Business Operations*', '*Revenue Operations*', '*RevOps*',
  '*Financial Analyst*', '*Finance Analyst*', '*FP&A*',

  // Engineering Leadership & Architecture
  '*Software Architect*', '*Solutions Architect*', '*Staff Engineer*', '*Principal Engineer*',
  '*Tech Lead*', '*Technical Lead*', '*Engineering Manager*', '*Director of Engineering*',
  '*VP of Engineering*', '*Head of Engineering*', '*Chief Technology Officer*', 'CTO *', '* CTO *', '* CTO',
];

// ── Multi-select Job Function Keyword Mapping ────────────────────────────────
export const FUNCTION_KEYWORD_MAP: Record<string, string[]> = {
  'Full Stack Engineer': ['*full stack*', '*fullstack*', '*full-stack*'],
  'Backend Engineer': ['*backend*', '*back end*', '*back-end*', '*server side*'],
  'Frontend Software Engineer': ['*frontend*', '*front end*', '*front-end*', '*ui engineer*'],
  'Python Engineer': ['*python*'],
  'Java Engineer': ['*java engineer*', '*java developer*', '*core java*', 'Java *', '* Java *', '* Java,*'],
  'C/C++ Engineer': ['*c++*', '*c/c++*', '*embedded*'],
  '.Net Engineer': ['*.net*', '*dotnet*', '*c#*'],
  'Systems Engineer': ['*systems engineer*', '*system engineer*'],
  'DevOps': ['*devops*', '*dev ops*', '*platform engineer*', '*site reliability*', 'SRE *', '* SRE *', '* SRE'],
  'Mobile Engineer': ['*mobile*', 'iOS *', '* iOS *', '* iOS/*', '* iOS-*', '* (iOS)*', '* iOS', '*android*', '*react native*', '*flutter*'],
  'QA / Test Automation': ['QA *', '* QA *', '* QA/*', '* QA-*', '* (QA)*', '* QA', '*quality assurance*', '*sdet*', '*automation engineer*', '*test engineer*', '*test automation*'],
  'Data Analyst': ['*data analyst*', '*data analytics*', '*bi analyst*', '*business intelligence analyst*', '*reporting analyst*'],
  'Data Scientist': ['*data scientist*', '*data science*', '*applied scientist*', '*decision scientist*', '*ai scientist*', '*ml scientist*'],
  'Data Engineer': ['*data engineer*', '*data platform*', '*etl*', '*data infrastructure*', '*data warehouse*'],
  'Machine Learning Engineer': ['*machine learning*', 'ML *', '* ML *', '* ML/*', '* ML-*', '* (ML)*', '* ML', '*deep learning*', '*mlops*', '*ml ops*', '*ml engineer*', 'AI *', '* AI *', '* AI/*', '* AI-*', '* (AI)*', '* AI', '*artificial intelligence*', '*generative ai*', '*genai*', '*gen ai*', '*llm*'],
  'AI Engineer': ['AI *', '* AI *', '* AI/*', '* AI-*', '* (AI)*', '* AI', '*artificial intelligence*', '*generative ai*', '*genai*', '*gen ai*', '*ai engineer*', '*ai developer*', '*machine learning*', 'ML *', '* ML *', '* ML/*', '* ML-*', '* (ML)*', '* ML', '*llm*'],
  'Machine Learning/AI Researcher': ['*ai research*', '*ml research*', '*machine learning research*', '*ai scientist*', '*ml scientist*', '*research scientist - ai*', '*research scientist - ml*'],
  'Machine Learning, Deep Learning': ['*deep learning*', '*neural network*', '*neural nets*', '*computer vision*', '*cv engineer*', '*vision engineer*'],
  'LLM Engineer': ['*llm*', '*large language*', '*nlp*', '*natural language*', '*prompt engineer*', '*ai agent*'],
  'Machine Learning, Computer Vision': ['*computer vision*', 'CV *', '* CV *', '* CV/*', '*image recognition*', '*vision engineer*'],
  'NLP Engineer': ['*nlp*', '*natural language*', '*text mining*', '*computational linguistics*'],
  'Cyber Security Engineer': ['*cyber security*', '*cybersecurity*', '*infosec*', '*appsec*', '*application security*', '*security engineer*', '*security analyst*', '*security architect*', '*information security*', '*soc analyst*', '*penetration tester*'],
  'Cloud Security Engineer': ['*cloud security*', '*devsecops*', '*cloud security engineer*', '*aws security*', '*azure security*'],
  'Network Security Engineer': ['*network security*', '*network security engineer*'],
  'Cloud Architect': ['*cloud*architect*', '*cloud engineer*', '*aws*architect*', '*azure*architect*'],
  'Site Reliability Engineer (SRE)': ['*site reliability*', 'SRE *', '* SRE *', '* SRE', '*reliability engineer*'],
  'Infrastructure Engineer': ['*infrastructure*', '*infra engineer*', '*platform engineer*'],
  'Product Manager': ['*product manager*', '*product lead*', 'PM *', '* PM *', '* PM'],
  'Technical Program Manager': ['*technical program manager*', '*program manager*', 'TPM *', '* TPM *', '* TPM'],
  'Product Designer': ['*product designer*', '*ux designer*', '*ui designer*', '*digital designer*', '*interaction designer*'],
  'UI/UX Designer': ['*ux*', 'UI *', '* UI *', '* UI/*', '* UI-*', '* (UI)*', '*user experience*', '*user interface*', '*ui designer*', '*ux designer*'],
  'Scrum Master / Agile Coach': ['*scrum master*', '*agile coach*', '*scrum*', '*agile*'],
  'Account Executive': ['*account executive*', '*account manager*', 'AE *', '* AE *', '* AE', '*enterprise sales*'],
  'Sales Development Rep': ['*sales development*', '*sdr*', '*business development representative*', '*bdr*'],
  'Marketing Specialist': ['*marketing specialist*', '*growth marketing*', '*product marketing*', '*digital marketing*', '*marketing manager*', '*brand marketing*'],
  'Operations Associate': ['*business operations*', '*revenue operations*', '*revops*', '*sales operations*', '*technical operations*', '*it operations*'],
  'Financial Analyst': ['*financial analyst*', '*finance analyst*', '*fp&a*'],
};

// ── Role categories for grouping ────────────────────────────────────────────
export const ROLE_CATEGORIES = [
  "Software Engineer", "Data Engineer", "Data Analyst", "Data Scientist",
  "DevOps / SRE", "Product Manager", "Designer", "QA / Testing",
  "Security", "Mobile",
];

// ── Popular skills for filter ───────────────────────────────────────────────
export const POPULAR_SKILLS = [
  "Python", "JavaScript", "TypeScript", "React", "SQL", "AWS",
  "Docker", "Kubernetes", "Java", "Go", "PostgreSQL", "Node.js",
  "Machine Learning", "GraphQL", "Terraform", "MongoDB",
];

// ── Skill Color Palette ─────────────────────────────────────────────────────
export const SKILL_COLORS: Record<string, string> = {
  Python: "#38bdf8", JavaScript: "#facc15", TypeScript: "#60a5fa",
  React: "#38bdf8", "Next.js": "#e2e8f0", Go: "#38bdf8", Rust: "#f97316",
  Java: "#fb923c", "C++": "#3b82f6", "C#": "#a855f7", ".NET": "#8b5cf6",
  SQL: "#38bdf8", Docker: "#0ea5e9", Kubernetes: "#6366f1", AWS: "#f59e0b",
  GCP: "#38bdf8", Azure: "#0284c7", PostgreSQL: "#38bdf8", MongoDB: "#22c55e",
  Redis: "#ef4444", GraphQL: "#ec4899", Terraform: "#a855f7", Git: "#f97316",
  Linux: "#eab308", Kafka: "#cbd5e1", Spark: "#f97316", Swift: "#f97316",
  Kotlin: "#a855f7", Flutter: "#38bdf8", "React Native": "#38bdf8",
  "Node.js": "#22c55e", Ruby: "#ef4444", PHP: "#818cf8", Vue: "#4ade80",
  Angular: "#ef4444", Tailwind: "#38bdf8", "Machine Learning": "#c084fc",
  AI: "#c084fc", LLM: "#c084fc", PyTorch: "#f97316", TensorFlow: "#f59e0b",
};

export function getSkillColor(skill: string): string {
  const exact = SKILL_COLORS[skill];
  if (exact) return exact;
  const lower = skill.toLowerCase();
  for (const [k, v] of Object.entries(SKILL_COLORS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return "#818cf8";
}
