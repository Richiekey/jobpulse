import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Default structured job function categories
export const DEFAULT_FUNCTION_CATEGORIES = [
  {
    id: "software-engineering",
    categoryName: "Software Engineering",
    iconName: "Terminal",
    subFunctions: [
      "Full Stack Engineer",
      "Backend Engineer",
      "Frontend Software Engineer",
      "Python Engineer",
      "Java Engineer",
      "C/C++ Engineer",
      ".Net Engineer",
      "Systems Engineer",
      "DevOps",
      "Mobile Engineer",
      "QA / Test Automation",
      "Rust Engineer",
      "Golang Developer",
    ],
    patterns: [
      "*Engineer*",
      "*Developer*",
      "*DevOps*",
      "*SRE*",
      "*QA*",
      "*SDET*",
      "*Full Stack*",
      "*Fullstack*",
      "*Backend*",
      "*Frontend*",
      "*Software*",
      "*Mobile*",
      "*iOS*",
      "*Android*",
      "*Platform*",
      "*Infrastructure*",
    ],
  },
  {
    id: "data-ai-ml",
    categoryName: "Data & AI / ML",
    iconName: "BrainCircuit",
    subFunctions: [
      "Data Analyst",
      "Data Scientist",
      "Data Engineer",
      "Machine Learning Engineer",
      "AI Engineer",
      "Machine Learning/AI Researcher",
      "Machine Learning, Deep Learning",
      "LLM Engineer",
      "Machine Learning, Computer Vision",
      "NLP Engineer",
      "AI Prompt Engineer",
    ],
    patterns: [
      "*Data*",
      "*Machine Learning*",
      "*ML *",
      "*AI *",
      "*Artificial Intelligence*",
      "*NLP*",
      "*LLM*",
      "*Deep Learning*",
      "*Computer Vision*",
      "*Scientist*",
      "*Analytics*",
    ],
  },
  {
    id: "cybersecurity-cloud",
    categoryName: "Cybersecurity & Cloud",
    iconName: "ShieldAlert",
    subFunctions: [
      "Cyber Security Engineer",
      "Cloud Security Engineer",
      "Network Security Engineer",
      "Cloud Architect",
      "Site Reliability Engineer (SRE)",
      "Infrastructure Engineer",
      "Security Analyst",
    ],
    patterns: ["*Security*", "*Cyber*", "*Cloud*", "*Network*"],
  },
  {
    id: "product-design",
    categoryName: "Product & Design",
    iconName: "Palette",
    subFunctions: [
      "Product Manager",
      "Technical Program Manager",
      "Product Designer",
      "UI/UX Designer",
      "Scrum Master / Agile Coach",
      "Design Systems Engineer",
    ],
    patterns: [
      "*Product Manager*",
      "*Program Manager*",
      "*TPM*",
      "*Designer*",
      "*UX*",
      "*UI*",
      "*Scrum*",
      "*Agile*",
    ],
  },
  {
    id: "business-ops",
    categoryName: "Business & Ops",
    iconName: "LineChart",
    subFunctions: [
      "Account Executive",
      "Sales Development Rep",
      "Marketing Specialist",
      "Operations Associate",
      "Financial Analyst",
      "Growth Strategist",
    ],
    patterns: [
      "*Account Executive*",
      "*Sales*",
      "*Marketing*",
      "*Operations*",
      "*Financial Analyst*",
      "*Business Analyst*",
    ],
  },
  {
    id: "leadership-exec",
    categoryName: "Engineering Leadership & Architecture",
    iconName: "Layers",
    subFunctions: [
      "Software Architect",
      "Staff Engineer",
      "Principal Engineer",
      "Tech Lead",
      "VP of Engineering",
      "Engineering Manager",
      "Head of Engineering",
      "CTO",
    ],
    patterns: [
      "*Architect*",
      "*Technical*",
      "*Tech Lead*",
      "*CTO*",
      "*VP Engineering*",
      "*Head of*",
      "*Director*",
      "*Manager*",
    ],
  },
];

// In-memory runtime store for custom configurations (can also sync with DB)
let activeFunctionCategories = [...DEFAULT_FUNCTION_CATEGORIES];

export async function GET() {
  return NextResponse.json({
    success: true,
    categories: activeFunctionCategories,
    allPatterns: Array.from(
      new Set(activeFunctionCategories.flatMap((c) => c.patterns))
    ),
    allSubFunctions: Array.from(
      new Set(activeFunctionCategories.flatMap((c) => c.subFunctions))
    ),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.categories && Array.isArray(body.categories)) {
      activeFunctionCategories = body.categories;
      return NextResponse.json({
        success: true,
        message: "Job function categories updated successfully",
        categories: activeFunctionCategories,
      });
    }

    if (body.resetToDefault) {
      activeFunctionCategories = [...DEFAULT_FUNCTION_CATEGORIES];
      return NextResponse.json({
        success: true,
        message: "Reset to default job functions successfully",
        categories: activeFunctionCategories,
      });
    }

    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update job functions" },
      { status: 500 }
    );
  }
}
