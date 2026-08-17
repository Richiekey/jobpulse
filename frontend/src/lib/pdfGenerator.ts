import jsPDF from "jspdf";

export interface ResumeData {
  atsScore?: number;
  matchingKeywords?: string[];
  missingKeywords?: string[];
  candidate?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
  summary?: string;
  experience?: Array<{
    role?: string;
    company?: string;
    location?: string;
    period?: string;
    highlights?: string[];
  }>;
  skills?: {
    languages?: string[];
    frameworks?: string[];
    toolsAndCloud?: string[];
  };
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
  }>;
  certifications?: string[];
}

export function generateResumePdf(resume: ResumeData, filename = "Tailored_Resume.pdf"): void {
  const doc = new jsPDF({
    unit: "pt",
    format: "letter", // 612 x 792 pt
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Helper for section headings
  const addSectionHeading = (title: string) => {
    checkPageBreak(30);
    y += 10;
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(title.toUpperCase(), margin, y);
    y += 4;
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.75);
    doc.line(margin, y, margin + contentWidth, y);
    y += 12;
  };

  // 1. CANDIDATE HEADER
  const name = resume.candidate?.name || "Candidate Name";
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(name, pageWidth / 2, y, { align: "center" });
  y += 18;

  // Contact info row
  const contactParts: string[] = [];
  if (resume.candidate?.email) contactParts.push(resume.candidate.email);
  if (resume.candidate?.phone) contactParts.push(resume.candidate.phone);
  if (resume.candidate?.location) contactParts.push(resume.candidate.location);
  if (resume.candidate?.linkedin) contactParts.push(resume.candidate.linkedin);
  if (resume.candidate?.github) contactParts.push(resume.candidate.github);

  if (contactParts.length > 0) {
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // Slate-600
    const contactLine = contactParts.join("  •  ");
    doc.text(contactLine, pageWidth / 2, y, { align: "center" });
    y += 16;
  }

  // 2. PROFESSIONAL SUMMARY
  if (resume.summary) {
    addSectionHeading("Professional Summary");
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    const summaryLines = doc.splitTextToSize(resume.summary, contentWidth);
    checkPageBreak(summaryLines.length * 13);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 13;
  }

  // 3. CORE TECHNICAL SKILLS
  if (resume.skills) {
    const skillCategories: Array<{ label: string; items?: string[] }> = [
      { label: "Languages", items: resume.skills.languages },
      { label: "Frameworks & Libs", items: resume.skills.frameworks },
      { label: "Tools & Cloud", items: resume.skills.toolsAndCloud },
    ].filter((c) => c.items && c.items.length > 0);

    if (skillCategories.length > 0) {
      addSectionHeading("Technical Skills");
      doc.setFontSize(9.5);

      skillCategories.forEach((cat) => {
        checkPageBreak(15);
        doc.setFont("times", "bold");
        doc.setTextColor(30, 41, 59);
        const prefix = `${cat.label}: `;
        doc.text(prefix, margin, y);
        const prefixWidth = doc.getTextWidth(prefix);

        doc.setFont("times", "normal");
        doc.setTextColor(51, 65, 85);
        const itemsText = (cat.items || []).join(", ");
        const itemLines = doc.splitTextToSize(itemsText, contentWidth - prefixWidth);
        
        doc.text(itemLines[0] || "", margin + prefixWidth, y);
        y += 13;

        if (itemLines.length > 1) {
          for (let i = 1; i < itemLines.length; i++) {
            checkPageBreak(13);
            doc.text(itemLines[i], margin + 10, y);
            y += 13;
          }
        }
      });
    }
  }

  // 4. PROFESSIONAL EXPERIENCE
  if (resume.experience && resume.experience.length > 0) {
    addSectionHeading("Professional Experience");

    resume.experience.forEach((exp) => {
      checkPageBreak(40);

      // Title & Period Row
      doc.setFont("times", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(exp.role || "Software Engineer", margin, y);

      if (exp.period) {
        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(exp.period, margin + contentWidth, y, { align: "right" });
      }
      y += 13;

      // Company & Location Row
      doc.setFont("times", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);
      doc.text(exp.company || "Company", margin, y);

      if (exp.location) {
        doc.setFont("times", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(exp.location, margin + contentWidth, y, { align: "right" });
      }
      y += 14;

      // Bullet points
      if (exp.highlights && exp.highlights.length > 0) {
        doc.setFont("times", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);

        exp.highlights.forEach((hl) => {
          const bullet = "•  ";
          const bulletWidth = doc.getTextWidth(bullet);
          const lines = doc.splitTextToSize(hl, contentWidth - bulletWidth - 4);
          
          checkPageBreak(lines.length * 12.5 + 4);
          doc.text(bullet, margin + 4, y);
          doc.text(lines, margin + 4 + bulletWidth, y);
          y += lines.length * 12.5 + 3;
        });
      }
      y += 6;
    });
  }

  // 5. EDUCATION
  if (resume.education && resume.education.length > 0) {
    addSectionHeading("Education");

    resume.education.forEach((edu) => {
      checkPageBreak(25);
      doc.setFont("times", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(edu.degree || "Degree", margin, y);

      if (edu.year) {
        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(edu.year, margin + contentWidth, y, { align: "right" });
      }
      y += 12;

      if (edu.institution) {
        doc.setFont("times", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
        doc.text(edu.institution, margin, y);
        y += 14;
      }
    });
  }

  // 6. CERTIFICATIONS
  if (resume.certifications && resume.certifications.length > 0) {
    addSectionHeading("Certifications & Honors");
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    resume.certifications.forEach((cert) => {
      checkPageBreak(14);
      doc.text(`•  ${cert}`, margin + 4, y);
      y += 13;
    });
  }

  // Save the PDF
  doc.save(filename);
}
