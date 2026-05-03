// ============================================================
// CHANGE: Each subject now has a `mockTests` array instead of
// a single dataFile. Each mock test has its own JSON file,
// label, and duration. Add more objects to the array to add
// more mock tests for that subject.
// ============================================================

const MCQ_SUBJECTS = [
    {
        slug: "cpp",
        name: "CPP",
        shortDescription: "Core C++ syntax, OOP basics, STL, and memory concepts.",
        accent: "sunrise",
        isVisible: true,
        // CHANGE: Multiple mock tests per subject
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/cpp/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/cpp/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/cpp/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/cpp/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/cpp/mcqs-005.json" },
        ]
    },
    {
        slug: "dbt",
        name: "DBT",
        shortDescription: "Database transactions, SQL concepts, normalization, and keys.",
        accent: "ocean",
        isVisible: true,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/dbt/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/dbt/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/dbt/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/dbt/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/dbt/mcqs-005.json" },
        ]
    },
    {
        slug: "oops-with-java",
        name: "OOPS with Java",
        shortDescription: "Classes, objects, inheritance, abstraction, and Java fundamentals.",
        accent: "teal",
        isVisible: true,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/oops-with-java/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/oops-with-java/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/oops-with-java/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/oops-with-java/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/oops-with-java/mcqs-005.json" },
            
        ]
    },
    {
        slug: "ads",
        name: "ADS",
        shortDescription: "Algorithms, data structures, complexity, and problem-solving patterns.",
        accent: "amber",
        isVisible: true,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/ads/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/ads/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/ads/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/ads/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/ads/mcqs-005.json" },
        ]
    },
    // CHANGE: Keep these as false until you have data for them
    {
        slug: "wpt",
        name: "WPT",
        shortDescription: "Web technologies, HTML, CSS, JavaScript, and responsive UI basics.",
        accent: "rose",
        isVisible: true,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/wpt/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/wpt/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/wpt/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/wpt/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/wpt/mcqs-005.json" },
        ]
    },
    {
        slug: "wjp",
        name: "WJP",
        shortDescription: "Java programming syntax, control flow, collections, and exceptions.",
        accent: "mint",
        isVisible: false,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/wjp/mcqs-001.json" },
        ]
    },
    {
        slug: "cossdm",
        name: "COSSDM",
        shortDescription: "Software development models, lifecycle phases, and team processes.",
        accent: "violet",
        isVisible: false,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/cossdm/mcqs-001.json" },
        ]
    },
    {
        slug: "ms-dot-net",
        name: "MS.NET",
        shortDescription: ".NET framework basics, C#, CLR, assemblies, and application structure.",
        accent: "sky",
        isVisible: false,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/ms-dot-net/mcqs-001.json" },
        ]
    },
    {
        slug: "aptitude",
        name: "APTITUDE",
        shortDescription: "Quantitative, logical reasoning, and verbal aptitude for placement preparation.",
        accent: "teal",
        isVisible: true,
        mockTests: [
            { id: "mock-1", label: "Mock Test 1", dataFile: "data/aptitude/mcqs-001.json" },
            { id: "mock-2", label: "Mock Test 2", dataFile: "data/aptitude/mcqs-002.json" },
            { id: "mock-3", label: "Mock Test 3", dataFile: "data/aptitude/mcqs-003.json" },
            { id: "mock-4", label: "Mock Test 4", dataFile: "data/aptitude/mcqs-004.json" },
            { id: "mock-5", label: "Mock Test 5", dataFile: "data/aptitude/mcqs-005.json" },
        ]
        
    }
];

const VISIBLE_SUBJECTS = MCQ_SUBJECTS.filter((subject) => subject.isVisible === true);

const SUBJECT_LOOKUP = VISIBLE_SUBJECTS.reduce((lookup, subject) => {
    lookup[subject.slug] = subject;
    return lookup;
}, {});

// CHANGE: Mock test constants — 40 questions, 60 minutes
const MOCK_TOTAL_QUESTIONS = 40;
const MOCK_DURATION_SECONDS = 60 * 60; // 3600 seconds = 60 minutes

function getCurrentYear() {
    return new Date().getFullYear();
}

function updateFooterYear() {
    document.querySelectorAll("#current-year").forEach((node) => {
        node.textContent = getCurrentYear();
    });
}

// CHANGE: Link now points to mock-select page instead of subjects page directly
function createSubjectLink(subject) {
    return `mock-select.html?subject=${encodeURIComponent(subject.slug)}`;
}

function renderHomeSubjects() {
    const grid = document.getElementById("subject-grid");
    if (!grid) return;

    grid.innerHTML = "";

    if (!VISIBLE_SUBJECTS.length) {
        grid.innerHTML = '<p class="status-message">No modules are enabled yet.</p>';
        return;
    }

    VISIBLE_SUBJECTS.forEach((subject, index) => {
        const card = document.createElement("article");
        card.className = `subject-card accent-${subject.accent}`;
        card.style.animationDelay = `${index * 80}ms`;

        // CHANGE: Show mock test count on card; clicking opens mock-select page
        card.innerHTML = `
            <p class="subject-tag">Module ${String(index + 1).padStart(2, "0")}</p>
            <h3>${subject.name}</h3>
            <p>${subject.mockTests.length} Mock Test${subject.mockTests.length > 1 ? "s" : ""} available</p>
            <a href="${createSubjectLink(subject)}">Select Mock Test →</a>
        `;
        grid.appendChild(card);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    updateFooterYear();
    renderHomeSubjects();
    window.MCQApp = {
        subjects: VISIBLE_SUBJECTS,
        subjectLookup: SUBJECT_LOOKUP,
        createSubjectLink,
        // CHANGE: Expose constants so mock pages can access them
        MOCK_TOTAL_QUESTIONS,
        MOCK_DURATION_SECONDS,
    };
});