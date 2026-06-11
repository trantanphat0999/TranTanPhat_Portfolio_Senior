/**
 * DB SEED SCRIPT
 * =====================================================
 * Pushes all current portfolio content to Firebase Firestore.
 *
 * HOW TO USE:
 * 1. Make sure you've filled in the apiKey in firebase-config.js
 * 2. Open portfolio in browser (via Live Server or similar)
 * 3. Open DevTools Console (F12)
 * 4. Run: import('/js/db-seed.js').then(m => m.seedAll())
 * 5. Wait for "✅ Seed complete!" message
 * =====================================================
 */

// ─── DATA: HEADER ───────────────────────────────────────────
const headerData = {
  name: "Tran Tan Phat",
  title: "Senior Quality Assurance Engineer",
  tagline:
    "Senior Quality Assurance Engineer with proven expertise in architecting enterprise test automation frameworks and driving quality excellence at scale. Specialized in API testing automation, performance engineering, and security testing with demonstrated ability to reduce defects by 80%, accelerate release cycles by 300%, and mentor high-performing QA teams. Track record of delivering mission-critical projects for Fortune 500 clients with zero production incidents through comprehensive testing strategies and innovative AI-enhanced methodologies.",
  location: "Binh Tan, Ho Chi Minh City",
  email: "trantanphat190999@gmail.com",
  phone: "0971817167",
  experience: "4+ Years in QA Engineering",
  availability: "Available for Remote Work",
  linkedin: "https://www.linkedin.com/in/tran-tan-phat-52631b261/",
  github: "https://github.com/trantanphat0999/portfolio.github.io",
  openToWork: true,
  heroTags: [
    "API Automation",
    "Performance Testing",
    "Security Testing",
    "Postman",
    "JMeter",
    "AI-Driven QA",
    "CI/CD Automation",
    "QA Mentorship",
  ],
  avatar: "image/1217VUTP0792.JPG",
};

// ─── DATA: SUMMARY ──────────────────────────────────────────
const summaryData = {
  overview:
    "Quality Assurance Engineer with 4+ years of proven expertise in building enterprise-grade testing frameworks and driving quality excellence across complex software systems. Specialized in API test automation, performance engineering, AI-driven testing workflows, and CI/CD pipeline automation — with demonstrated ability to scale testing operations while maintaining rigorous quality standards.",
  coreExpertise: [
    {
      title: "RESTful API Testing Excellence",
      description:
        "Architected comprehensive API testing framework covering 50+ microservices, achieving 80% automation coverage and reducing regression cycles from 3 days to 6 hours.",
    },
    {
      title: "Performance Engineering",
      description:
        "Designed and executed JMeter load & stress tests collaborating with Backend, Database, and DevOps teams. Achieved system benchmark of processing 200,000+ records within 2 seconds.",
    },
    {
      title: "CI/CD Pipeline Automation",
      description:
        "Implemented GitHub Actions workflows to trigger daily API automation tests, auto-generate reports, and distribute results to the support team via automated email delivery.",
    },
    {
      title: "Test Strategy & Framework Design",
      description:
        "Skilled in developing comprehensive testing strategies from requirement analysis through test execution, deployment validation, and release quality assurance.",
    },
  ],
  leadership: [
    {
      title: "Team Mentorship",
      description:
        "Successfully mentoring 5 QA team members (Middle, Junior, Fresher levels) on AI testing workflows, API automation, estimation techniques, deployment planning, and testing strategy — driving measurable skill development across all levels.",
    },
    {
      title: "AI-Driven Innovation",
      description:
        "Pioneered integration of AI technologies (ChatGPT, Claude, Grok) into testing workflows, achieving 40% productivity improvement through intelligent test generation, prompt engineering, and AI-assisted test analysis. Trained QA and BA teams on AI usage and designed AI prompts for automated testing workflows.",
    },
    {
      title: "Automation Scheduling",
      description:
        "Utilized Windows Scheduler to run daily automation tests and send automated email reports, ensuring continuous monitoring and timely reporting without manual intervention.",
    },
    {
      title: "Agile Process Optimization",
      description:
        "Expert in Agile methodology, supporting Product Managers during client demos, managing deployment plans, and deploying innovative QA solutions that significantly reduce testing cycle time while maintaining quality standards.",
    },
  ],
  careerObjective:
    "Senior QA Engineer with a proven track record in scaling automation frameworks and elevating testing standards. Targeting a Tech Lead role to drive engineering excellence across teams and shape quality culture at an organizational level.",
};

// ─── DATA: EXPERIENCE ───────────────────────────────────────
const experienceData = {
  jobs: [
    {
      company: "Sutrix Solution",
      logo: "image/sutrix-solutions-logo.webp",
      role: "QA Intern",
      period: "Mar 2021 - May 2021",
      badge: "QA Intern",
      description:
        "During my 2-month internship as a QA Intern, I had the opportunity to be involved in the software testing process, where I learned how to write test cases, perform manual testing, log bugs in Jira, and report daily progress to my team leader. Participating in daily meetings each morning helped me understand the Agile workflow, how tasks are assigned and tracked, and the important role QA plays in ensuring product quality.",
      highlights: [
        { icon: "ri-eye-line", title: "Manual Testing", desc: "Executed test cases to ensure functionality." },
        { icon: "ri-bug-line", title: "Bug Reporting", desc: "Logged and tracked bugs in Jira." },
        { icon: "ri-file-list-3-line", title: "Test Case Design", desc: "Created reusable and clear test cases." },
        { icon: "ri-group-line", title: "Agile Practices", desc: "Joined daily stand-ups and sprint tasks." },
      ],
    },
    {
      company: "Silicon Stack",
      logo: "image/images.png",
      role: "Quality Assurance Engineer",
      period: "Aug 2021 - Present",
      badge: "Senior QA Engineer",
      description:
        "Quality Assurance Engineer with 4+ years of specialized experience in comprehensive software testing, specializing in API test automation, performance engineering, AI-driven testing workflows, and CI/CD pipeline automation. Core responsibilities include requirement analysis, test strategy design, test planning, test case design, functional testing, API automation testing, bug tracking with Jira, deployment validation, and release quality assurance. Experienced in supporting Product Managers during client demos, managing deployment plans, and applying AI tools (ChatGPT, Claude, Grok) to optimize testing processes. Mentoring 5 QA team members on modern testing approaches, AI-assisted QA methodologies, and automation best practices.",
      highlights: [
        { icon: "ri-robot-2-line", title: "API Automation", desc: "Postman + GitHub Actions CI/CD pipeline." },
        { icon: "ri-speed-up-line", title: "Performance Testing", desc: "JMeter load & stress — 200K records/2s." },
        { icon: "ri-cpu-line", title: "AI-Powered QA", desc: "Prompt engineering & AI-assisted workflows." },
        { icon: "ri-user-star-line", title: "Team Mentorship", desc: "Mentored 5 members: Middle, Junior, Fresher." },
      ],
    },
  ],
};

// ─── DATA: SKILLS ────────────────────────────────────────────
const skillsData = {
  categories: [
    {
      name: "Testing Skills",
      icon: "ri-bug-2-line",
      skills: [
        { icon: "ri-function-line", title: "Functional Testing", desc: "Integration, Regression, Smoke & Sanity, Exploratory, E2E" },
        { icon: "ri-bar-chart-2-line", title: "Non-Functional Testing", desc: "Performance, Security, Usability, Compatibility" },
        { icon: "ri-plug-2-line", title: "API Testing", desc: "Functional, Performance, Security" },
        { icon: "ri-file-list-3-line", title: "Test Document", desc: "Test case, Test Plan, Bug Report, Test guide" },
        { icon: "ri-layout-2-line", title: "UI Testing", desc: "Visual, Cross-browser" },
      ],
    },
    {
      name: "Automation Tools",
      icon: "ri-robot-2-line",
      skills: [
        { icon: "ri-send-plane-2-line", title: "Postman Tool", desc: "Collection, Environment, Tests, Newman, Monitor, Workspaces" },
        { icon: "ri-bar-chart-box-line", title: "Jmeter Tool", desc: "Thread Group, Ramp-Up Period, Throughput, Stepping Thread Group / Ultimate Thread Group" },
        { icon: "ri-shield-line", title: "OWASP ZAP Tool", desc: "XSS (Cross-Site Scripting), SQL Injection, Command Injection, Broken Authentication" },
        { icon: "ri-macbook-line", title: "AkaAT Studio", desc: "Test case, Test Suite, Test Step, Variable, Test Data" },
      ],
    },
    {
      name: "Programming Languages",
      icon: "ri-code-s-slash-line",
      skills: [
        { icon: "ri-javascript-line", title: "JavaScript", desc: "API Automation Testing using Postman Tool" },
        { icon: "ri-database-2-line", title: "Database — SQL / SQL Server", desc: "Querying, Data Extraction, Data Validation" },
      ],
    },
    {
      name: "Frameworks & Tools",
      icon: "ri-tools-line",
      skills: [
        { icon: "ri-task-line", title: "Jira - Project Management And Issue Tracking Tool", desc: "Create Issue, Assign, Comment, Transition, Workflow" },
        { icon: "ri-github-line", title: "GitHub Actions - CI/CD Automation", desc: "Daily API automation triggers, report generation, automated email distribution" },
        { icon: "ri-time-line", title: "Windows Scheduler - Automation Scheduling", desc: "Daily test runs, automated email report delivery" },
        { icon: "ri-cpu-line", title: "AI Tools - ChatGPT, Claude, Grok", desc: "Prompt engineering, AI-assisted test generation, QA & BA team training" },
        { icon: "ri-share-forward-line", title: "n8n - Workflow Automation", desc: "Orchestrate system communication, automate interaction processes" },
      ],
    },
  ],
};

// ─── DATA: PROJECTS (cards) ──────────────────────────────────
const projectsData = {
  items: [
    {
      id: "projecthub",
      title: "Communication Hub - SiliconStack",
      badge: "AI Platform",
      badgeColor: "bg-primary",
      description:
        "An AI-driven communication platform integrating workflows across BA, Developers, Designers, and QA using n8n automation. Features AI chatbot for customer support, vehicle repair booking, and customer interaction analytics...",
      tags: ["AI Chatbot", "n8n", "Postman", "Jira"],
      image: null,
      imageIcon: "ri-chat-ai-line",
      modalId: "projecthub",
      detailDuration: "2025 - Present",
      detailClient: "Internal Product – SiliconStack",
      detailRole: "Senior Quality Assurance",
      detailOverview: "Communication Hub is an AI-driven communication platform designed to integrate and orchestrate workflows across Business Analysts, Developers, Designers, and QA teams. The system leverages n8n automation workflows to streamline system communication and automate customer interaction processes at scale.\n\nThe platform features an intelligent AI chatbot for customer support, enabling customers to book vehicle repair appointments, schedule maintenance, and make vehicle purchasing inquiries — all through a unified conversational interface. A built-in customer interaction management system ensures all interactions are tracked, categorized, and escalated appropriately.\n\nThe platform includes a comprehensive dashboard displaying customer feedback reports and analytics, providing actionable insights to management and support teams. All workflows are automated using n8n, enabling seamless end-to-end orchestration without manual intervention.",
      detailResponsibilities: "Analyzed business requirements and translated them into comprehensive test plans and test cases covering all AI chatbot conversation flows and edge cases.\nDesigned and executed functional testing for all platform modules including AI chatbot, appointment booking, maintenance scheduling, and analytics dashboard.\nDeveloped API automation test scripts using Postman to validate n8n workflow orchestration endpoints, webhook triggers, and integration points across services.\nApplied AI-assisted testing strategies — used prompt engineering with ChatGPT and Claude to generate test scenarios, edge cases, and exploratory test checklists for AI chatbot behavior validation.\nTracked and managed defects in Jira with detailed reproduction steps, severity classification, and cross-team follow-up to ensure timely resolution.\nPerformed deployment validation across Dev, UAT, and Production environments, conducting smoke tests post-release to confirm system stability.\nSupported Product Manager during client demos — prepared demo scripts, verified feature readiness, and documented client feedback for follow-up action items.\nCollaborated closely with BA, Developers, and Designers to clarify requirements, review UI/UX flows, and align test coverage with business acceptance criteria.",
      detailTechnologies: "n8n (Workflow Automation), AI Chatbot, Postman (API Automation), Jira (Bug Tracking), ChatGPT / Claude (AI-Assisted Testing), Chrome DevTools, Agile/Scrum",
      detailResults: "Achieved comprehensive test coverage for all AI chatbot conversation paths including fallback, escalation, and edge case scenarios.\nAPI automation testing validated n8n workflow integrations, ensuring reliable end-to-end orchestration with zero critical failures in UAT.\nAI-assisted testing strategies accelerated test case generation by 35%, enabling faster sprint delivery without sacrificing coverage quality.\nSupported multiple successful client demos with zero blocking issues — thorough pre-demo validation ensured a smooth and professional presentation experience."
    },
    {
      id: "project4",
      title: "CRM System - SiliconStack",
      badge: "Automotive",
      badgeColor: "bg-primary",
      description:
        "A web-based CRM system for the automotive industry, designed to manage post-sale customer relationships. It stores customer and vehicle data, supports marketing campaigns (e.g., service promotions, anniversary messages), and provides automated reminders for scheduled maintenance...",
      tags: ["OWASP ZAP", "JMeter", "Selenium", "Docker"],
      image: "image/CRM.png",
      modalId: "project4",
      detailDuration: "Jan 2025 - Oct 2025",
      detailClient: "Internal Product – SiliconStack",
      detailRole: "Senior Quality Assurance",
      detailOverview: "The CRM system is a web-based platform tailored for the automotive industry, specifically designed to manage and enhance customer relationships after vehicle purchase. Once a customer purchases a car from the dealership, both their personal information and vehicle details (such as model, purchase date, and service history) are stored in the system.\n\nThe CRM enables marketing teams to launch targeted campaigns, such as service promotions, customer anniversary greetings, and loyalty rewards. It includes automated scheduling features that notify staff when key customer milestones are reached — for example, reminding a service advisor to call the customer when the vehicle is due for routine maintenance based on the purchase date and mileage intervals.\n\nThe system also supports task and activity tracking for sales and service representatives, campaign performance analytics, and seamless integration with third-party services (e.g., email, SMS, and call center platforms). Its goal is to streamline customer engagement, improve service retention, and increase post-sale satisfaction.",
      detailResponsibilities: "Conducted security assessments using OWASP ZAP and reported vulnerabilities.\nDesigned and executed JMeter load tests for critical user journeys.\nAutomated UI tests with Selenium in Docker containers for CI/CD pipelines.",
      detailTechnologies: "OWASP ZAP, JMeter, Selenium, Docker",
      detailResults: "Identified and remediated 12 security vulnerabilities pre-launch.\nValidated platform stability for 50,000+ concurrent users."
    },
    {
      id: "project3",
      title: "Time Keeper - Silicon Stack",
      badge: "HRTech",
      badgeColor: "bg-primary",
      description:
        "Time Keeper is an internal web-based tool by SiliconStack for tracking employee working hours and managing project resources. It allows staff to log time daily or weekly, with Jira integration for task-level tracking...",
      tags: ["Agile/Scrum", "Jira", "SQL", "Chrome DevTools"],
      image: "image/TKP.png",
      modalId: "project3",
      detailDuration: "Jan 2022 - Dec 2023",
      detailClient: "Internal Product – SiliconStack",
      detailRole: "Junior Quality Assurance",
      detailOverview: "Time Keeper is a web-based internal tool developed by SiliconStack to manage employee time tracking, project workload, and resource allocation. Employees can log daily or weekly working hours against specific projects or Jira tasks, with fixed 8-hour workdays and support for overtime logging.\n\nManagers (Team Leads or PMs) can review, approve, or reject time entries, and monitor team productivity through dashboards and exportable reports. The tool is integrated with Jira for seamless time logging per ticket and task synchronization.",
      detailResponsibilities: "Analyzed functional and non-functional requirements to ensure test coverage aligned with business needs.\nDesigned and executed structured test cases for core modules including time logging, approval workflows, dashboards, and Jira integration.\nPerformed manual functional testing and UI validation across multiple environments (UAT, Staging, Production).\nIdentified, documented, and tracked bugs using Jira, ensuring clear reproduction steps and follow-up.\nUsed excel online to manage test suites and maintain traceability.\nCollaborated closely with developers, BA, and PM during daily stand-ups to clarify requirements and ensure QA alignment.\nPrepared daily test status reports and communicated progress to the Team Leader.\nParticipated in user acceptance testing (UAT) support and post-deployment verification.",
      detailTechnologies: "Agile/Scrum, Jira, SQL, Chrome DevTools",
      detailResults: "Improved defect detection rate by thoroughly executing test cases across all time logging scenarios and Jira integration.\nAchieved full test coverage for core modules including log time, approval workflows, and report exports, ensuring functional stability.\nMinimized UAT defects by identifying and reporting critical issues early in the development cycle through close collaboration with dev and PM teams.\nEnhanced transparency and QA accountability by implementing structured daily progress reports.\nContributed to the successful launch of the Time Keeper tool, improving team productivity and time management across the organization."
    },
    {
      id: "project1",
      title: "Promotion Claim Automation - Kraft Heinz",
      badge: "RetailTech",
      badgeColor: "bg-yellow-500",
      description:
        "Automated system for extracting and processing invoice data (PDF/Excel), calculating totals and tax, and syncing results to Kraft Heinz. Involved in QA tasks and API automation to ensure data correctness...",
      tags: ["Postman", "Javascript", "Jira", "PDF & Excel Parsers"],
      image: "image/Promotionclaim.png",
      modalId: "project1",
      detailDuration: "May 2024 - Dec 2024",
      detailClient: "Kraft Heinz Company",
      detailRole: "Middle Quality Assurance",
      detailOverview: "Promotion Automation is a web-based system designed to automatically extract and process data from PDF and Excel invoice files. Using business-specific logic, the system calculates total amounts, tax, and profit values.\n\nUsers can review, edit, and export the processed data before it is automatically submitted to Kraft Heinz's central system via scheduled end-of-day jobs. This automation streamlines manual processes, improves accuracy, and enhances reporting efficiency.",
      detailResponsibilities: "Analyzed customer requirements and translated them into structured test cases and validation scenarios to ensure full coverage of business logic.\nDesigned and executed manual and automated tests for PDF and Excel data inputs with varying formats, ensuring consistent system performance and accuracy.\nDeveloped and maintained API automation tests to validate data extraction logic across multiple invoice formats, significantly reducing manual testing time and improving reliability.\nPerformed functional, regression, and smoke testing across Dev, UAT, and Production environments, ensuring stability before each release.\nTracked and managed bugs using Jira, maintaining clear bug-tracking documentation and facilitating timely resolutions with the development team.\nMonitored daily UAT and Production deployments, verified outcomes via smoke tests, and provided detailed test reports to stakeholders.\nProvided daily updates and reported key risks and test progress to the Team Leader to ensure transparency and accountability.\nContributed to product improvement by suggesting UX enhancements and identifying edge cases based on defect trends.",
      detailTechnologies: "Postman (API Automation), Jira (Bug Tracking), Excel (Test Case Management), Chrome DevTools, PDF & Excel Data Parsers, SQL Server",
      detailResults: "Achieved 95% test case coverage, reducing defect leakage in UAT by 40%.\nAPI automation testing reduced validation time for large and inconsistent file formats by over 60%, ensuring faster and more accurate releases.\nSupported 9 successful Production releases with zero critical issues post-deployment.\nRecognized by project stakeholders for improving test efficiency and enhancing communication across QA and development teams."
    },
    {
      id: "project2",
      title: "Stuck Claim - Kraft Heinz",
      badge: "RetailTech",
      badgeColor: "bg-yellow-500",
      description:
        "A high-volume claim processing system for Kraft Heinz, designed to automate data imports, match promotional transactions, and streamline manual review workflows across AU and NZ regions...",
      tags: ["Postman", "Jira", "SQL Server", "Excel"],
      image: "image/SCbanner.png",
      modalId: "project2",
      detailDuration: "Jan 2024 - May 2024",
      detailClient: "Kraft Heinz Company",
      detailRole: "Junior Quality Assurance",
      detailOverview: "The Stuck Claim project is a high-volume web application developed for Kraft Heinz to automate and streamline the resolution of promotional claims that are delayed or stuck in processing. Each day, the system automatically imports large datasets (100,000+ rows per file) from a designated customer folder, including claim and promo files. These datasets are processed using complex business rules to handle both Australia (AU) and New Zealand (NZ) markets.\n\nThe system performs automatic matching of claim and promo lines based on multiple dynamic conditions. If a match satisfies the predefined criteria from the master configuration file, the line is automatically marked as Completed. Otherwise, the line remains in a Pending state, requiring manual verification and completion by the user.\n\nAt the end of each day, a scheduled job re-imports all matched and completed entries back into the central Kraft Heinz system to ensure synchronization and data consistency. The solution improves operational efficiency, reduces manual effort, and ensures accuracy in promotional claim management across regional markets.",
      detailResponsibilities: "Analyzed business requirements and designed functional test cases covering both standard and edge cases.\nPerformed end-to-end manual testing across Dev, UAT, and Production environments to ensure product reliability.\nCreated and executed automation test scripts for key regression flows using Postman.\nConducted performance validation on large data imports to verify system stability under high load.\nUsed Jira for bug tracking, ticket management, and sprint progress monitoring.\nMaintained and updated test documentation and daily QA reports to ensure transparency with stakeholders.\nCollaborated directly with the client to gather requirements and perform sprint demos in the absence of the BA.\nDiscussed requirements and estimates with the PM, independently created development tasks, and assigned to the dev team based on team estimation.\nProvided sprint-level progress demos to the PM, ensuring alignment and timely delivery.",
      detailTechnologies: "Postman, Jira, Chrome DevTools, Agile/Scrum, SQL, Excel",
      detailResults: "Improved test efficiency and regression reliability by applying selective automation for repetitive scenarios.\nEnsured stable performance of large-scale data imports through structured QA validation.\nIdentified high-priority bugs pre-release, avoiding major Production incidents.\nSuccessfully handled cross-functional coordination in the absence of a BA, ensuring uninterrupted project flow.\nMaintained QA ownership across requirement clarification, task planning, and sprint delivery demo—contributing to consistent on-time releases."
    }
  ],
};

// ─── DATA: ACHIEVEMENTS ──────────────────────────────────────
const achievementsData = {
  items: [
    {
      title: "Bug Hunter 2025",
      subtitle: "Annual Recognition Award",
      description:
        "Recognized for exceptional bug detection and quality assurance contributions. Demonstrated outstanding ability to identify critical defects before production release, significantly reducing post-deployment incidents and protecting product quality.",
      icon: "ri-bug-fill",
      color: "yellow",
      borderClass: "border-yellow-200",
      iconBgClass: "bg-yellow-100",
      iconTextClass: "text-yellow-600",
      subtitleClass: "text-yellow-600",
      cornerBgClass: "bg-yellow-50",
      cornerIconClass: "ri-trophy-fill text-yellow-400",
    },
    {
      title: "Performance Benchmark",
      subtitle: "Load & Stress Testing",
      description:
        "System successfully handles 200,000+ records within 2 seconds — achieved through collaborative performance optimization with Backend, Database, and DevOps teams using JMeter load and stress testing frameworks.",
      icon: "ri-bar-chart-fill",
      color: "blue",
      borderClass: "border-blue-200",
      iconBgClass: "bg-blue-100",
      iconTextClass: "text-blue-600",
      subtitleClass: "text-blue-600",
      cornerBgClass: "bg-blue-50",
      cornerIconClass: "ri-speed-fill text-blue-400",
    },
    {
      title: "CI/CD Pipeline",
      subtitle: "GitHub Actions Automation",
      description:
        "Implemented end-to-end CI/CD automation using GitHub Actions — triggering daily API tests, auto-generating reports, and delivering results to the support team automatically. Eliminated manual execution overhead entirely.",
      icon: "ri-github-fill",
      color: "green",
      borderClass: "border-green-200",
      iconBgClass: "bg-green-100",
      iconTextClass: "text-green-600",
      subtitleClass: "text-green-600",
      cornerBgClass: "bg-green-50",
      cornerIconClass: "ri-git-branch-fill text-green-400",
    },
    {
      title: "AI-Driven QA",
      subtitle: "40% Productivity Boost",
      description:
        "Pioneered AI integration (ChatGPT, Claude, Grok) into QA workflows — designed prompt engineering strategies for test generation, trained QA and BA teams on AI usage, achieving a 40% increase in testing productivity.",
      icon: "ri-cpu-fill",
      color: "purple",
      borderClass: "border-purple-200",
      iconBgClass: "bg-purple-100",
      iconTextClass: "text-purple-600",
      subtitleClass: "text-purple-600",
      cornerBgClass: "bg-purple-50",
      cornerIconClass: "ri-sparkling-2-fill text-purple-400",
    },
    {
      title: "Team Mentorship",
      subtitle: "5 Members Trained",
      description:
        "Successfully mentored 5 QA engineers (Middle, Junior, Fresher) across topics including AI testing workflows, API automation, estimation techniques, deployment planning, and testing strategy design.",
      icon: "ri-user-star-fill",
      color: "primary",
      borderClass: "border-primary/20",
      iconBgClass: "bg-primary/10",
      iconTextClass: "text-primary",
      subtitleClass: "text-primary",
      cornerBgClass: "bg-primary/5",
      cornerIconClass: "ri-team-fill text-primary/40",
    },
    {
      title: "Zero Production Incidents",
      subtitle: "Release Quality Assurance",
      description:
        "Supported 9+ successful Production releases with zero critical post-deployment incidents through comprehensive deployment validation, smoke testing, and rigorous release quality assurance processes.",
      icon: "ri-shield-check-fill",
      color: "teal",
      borderClass: "border-teal-200",
      iconBgClass: "bg-teal-100",
      iconTextClass: "text-teal-600",
      subtitleClass: "text-teal-600",
      cornerBgClass: "bg-teal-50",
      cornerIconClass: "ri-shield-check-fill text-teal-400",
    },
  ],
};

// ─── DATA: EDUCATION ────────────────────────────────────────
const educationData = {
  degrees: [
    {
      title: "Bachelor of Information Technology Engineering",
      institution: "Ho Chi Minh City University of Industry and Trade",
      period: "2017 - 2022",
      description:
        "Specialized in Software Engineering with focus on Quality Assurance methodologies and software testing practices.",
    },
  ],
  certifications: [
    {
      title: "ISTQB Certified Tester - Finance Testing (CT-FT) (Vietnamese)",
      issuer: "Udemy",
      year: "2026",
      link: "https://www.udemy.com/certificate/UC-32858cb1-8096-424b-84a5-4f04490a2951/",
      color: "primary",
    },
    {
      title: "ISTQB Test Management (Vietnamese)",
      issuer: "Udemy",
      year: "2026",
      link: "https://www.udemy.com/certificate/UC-92bc0efe-5003-47b6-a8a4-1133ffe60f92/",
      color: "primary",
    },
    {
      title: "Language Certificate",
      issuer: "Ho Chi Minh City University of Industry and Trade",
      credentialNote: "Credential ID: DCTNN0000229",
      year: "2023",
      link: null,
      color: "primary",
    },
    {
      title: "Exploratory Testing",
      issuer: "Udemy",
      year: "2024",
      link: "https://www.udemy.com/certificate/UC-01d1dc60-f840-4900-9515-df5d09e10710/",
      color: "primary",
    },
    {
      title: "Gemini Certified Educator",
      issuer: "Google",
      year: "2025",
      link: "https://edu.google.accredible.com/fca194cb-605b-4f77-b7f3-37896f6702d6#acc.WB2QebPL",
      color: "primary",
    },
    {
      title: "Introduction to Model Context Protocol",
      issuer: "Anthropic",
      year: "2025",
      link: "http://verify.skilljar.com/c/chskx55fdhfq",
      color: "orange",
    },
    {
      title: "Teaching AI Fluency",
      issuer: "Anthropic",
      year: "2025",
      link: "http://verify.skilljar.com/c/2tywqqdk2nsd",
      color: "orange",
    },
    {
      title: "AI Fluency for Educators",
      issuer: "Anthropic",
      year: "2025",
      link: "http://verify.skilljar.com/c/gpdrwzut7cei",
      color: "orange",
    },
  ],
};

// ─── DATA: CONTACT ───────────────────────────────────────────
const contactData = {
  email: "trantanphat190999@gmail.com",
  phone: "0971817167",
  location: "Binh Tan, Ho Chi Minh City",
  socials: [
    { name: "LinkedIn", icon: "ri-linkedin-fill", url: "https://www.linkedin.com/in/tran-tan-phat-52631b261/" },
    { name: "GitHub", icon: "ri-github-fill", url: "https://github.com/trantanphat0999/portfolio.github.io" },
    { name: "Facebook", icon: "ri-facebook-fill", url: "https://www.facebook.com/trantanphat1909/" },
    { name: "TikTok", icon: "ri-tiktok-fill", url: "https://www.tiktok.com/@learnqa?lang=vi-VN" },
    { name: "Zalo", icon: "ri-message-3-fill", url: null, isZalo: true },
  ],
};

// ─── SEED ALL ────────────────────────────────────────────────
export const PORTFOLIO_SEED_DOCS = {
  header: headerData,
  summary: summaryData,
  experience: experienceData,
  skills: skillsData,
  projects: projectsData,
  achievements: achievementsData,
  education: educationData,
  contact: contactData,
};

export function getSeedPortfolioData() {
  return JSON.parse(JSON.stringify(PORTFOLIO_SEED_DOCS));
}

async function writeSeedDoc(docId, data) {
  const { writePortfolioDoc } = await import("./firebase-config.js");
  return writePortfolioDoc(docId, data);
}

export async function seedAll() {
  console.log("🚀 [Seed] Starting to seed portfolio data to Firestore...");

  const docs = getSeedPortfolioData();

  for (const [docId, data] of Object.entries(docs)) {
    try {
      await writeSeedDoc(docId, data);
      console.log(`  ✅ Seeded: portfolio/${docId}`);
    } catch (err) {
      console.error(`  ❌ Failed: portfolio/${docId}`, err);
    }
  }

  console.log("🎉 [Seed] Seed complete! All portfolio data is now in Firestore.");
  console.log("📋 Documents created:");
  Object.keys(docs).forEach((key) => console.log(`   • portfolio/${key}`));
}

// ─── INDIVIDUAL SEED FUNCTIONS ───────────────────────────────
export const seedHeader = () => writeSeedDoc("header", headerData);
export const seedSummary = () => writeSeedDoc("summary", summaryData);
export const seedExperience = () => writeSeedDoc("experience", experienceData);
export const seedSkills = () => writeSeedDoc("skills", skillsData);
export const seedProjects = () => writeSeedDoc("projects", projectsData);
export const seedAchievements = () => writeSeedDoc("achievements", achievementsData);
export const seedEducation = () => writeSeedDoc("education", educationData);
export const seedContact = () => writeSeedDoc("contact", contactData);
