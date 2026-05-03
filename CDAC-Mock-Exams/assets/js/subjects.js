document.addEventListener("DOMContentLoaded", () => {
    const isSubjectPage = document.body.dataset.page === "subject";
    const app = window.MCQApp;

    if (!isSubjectPage || !app) {
        return;
    }

    const QUESTIONS_PER_PAGE = 10;
    const titleNode = document.getElementById("subject-title");
    const descriptionNode = document.getElementById("subject-description");
    const countNode = document.getElementById("question-count");
    const statusNode = document.getElementById("status-message");
    const questionContainer = document.getElementById("question-container");
    const paginationContainer = document.getElementById("pagination");
    const pageIndicator = document.getElementById("page-indicator");
    const subjectTabs = document.getElementById("subject-tabs");
    const state = {
        currentSubject: null,
        questions: [],
        currentPage: 1,
        visitedPages: new Set()
    };

    function getSubjectFromQuery() {
        const params = new URLSearchParams(window.location.search);
        const requestedSubject = params.get("subject");
        if (requestedSubject && app.subjectLookup[requestedSubject]) {
            return app.subjectLookup[requestedSubject];
        }

        return app.subjects[0] || null;
    }

    function renderTabs(activeSlug) {
        subjectTabs.innerHTML = "";

        if (!app.subjects.length) {
            return;
        }

        app.subjects.forEach((subject) => {
            const link = document.createElement("a");
            link.href = `index.html?subject=${encodeURIComponent(subject.slug)}`;
            link.className = subject.slug === activeSlug ? "subject-tab active" : "subject-tab";
            link.textContent = subject.name;
            subjectTabs.appendChild(link);
        });
    }

    function renderQuestions(page) {
        const { paginatedQuestions, totalPages, currentPage } = paginateQuestions(
            state.questions,
            page,
            QUESTIONS_PER_PAGE
        );

        state.currentPage = currentPage;
        questionContainer.innerHTML = "";
        paginationContainer.innerHTML = "";

        if (!state.questions.length) {
            statusNode.textContent = "No questions added yet. Update the subject JSON file to populate this module.";
            pageIndicator.textContent = "Page 0";
            return;
        }

        statusNode.textContent = "";
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;

        function normalizeValue(value) {
            return String(value || "").trim().toLowerCase();
        }

        function getSnippetCode(item) {
            if (Array.isArray(item.snippetLines)) {
                return item.snippetLines.join("\n");
            }

            if (item.snippet && Array.isArray(item.snippet.lines)) {
                return item.snippet.lines.join("\n");
            }

            if (typeof item.snippet === "string") {
                return item.snippet;
            }

            return "";
        }

        paginatedQuestions.forEach((item, index) => {
            const questionNumber = (currentPage - 1) * QUESTIONS_PER_PAGE + index + 1;
            const card = document.createElement("article");
            card.className = "question-card";

            const meta = document.createElement("div");
            meta.className = "question-meta";
            meta.textContent = `Question ${questionNumber}`;

            const title = document.createElement("h3");
            title.textContent = item.question || "Untitled question";

            const snippetCode = getSnippetCode(item);
            const hasSnippet = Boolean(snippetCode.trim());
            const snippetBlock = document.createElement("pre");
            snippetBlock.className = "question-snippet";
            if (hasSnippet) {
                const codeNode = document.createElement("code");
                codeNode.textContent = snippetCode;
                snippetBlock.appendChild(codeNode);
            }

            const optionList = document.createElement("ul");
            optionList.className = "option-list";

            const feedback = document.createElement("p");
            feedback.className = "answer-feedback";
            feedback.textContent = "Select the correct option to reveal the answer.";

            const answerPill = document.createElement("p");
            answerPill.className = "answer-pill hidden";
            answerPill.textContent = `Answer: ${item.answer || "Not provided"}`;

            const normalizedAnswer = normalizeValue(item.answer);
            const hasAnswer = Boolean(normalizedAnswer);
            const optionButtons = [];

            if (Array.isArray(item.options) && item.options.length) {
                item.options.forEach((option) => {
                    const listItem = document.createElement("li");
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = "option-button";
                    button.textContent = option;

                    button.addEventListener("click", () => {
                        if (!hasAnswer || button.disabled || answerPill.classList.contains("hidden") === false) {
                            return;
                        }

                        const isCorrect = normalizeValue(option) === normalizedAnswer;

                        if (isCorrect) {
                            button.classList.add("correct");
                            feedback.textContent = "Correct! Answer unlocked.";
                            feedback.className = "answer-feedback success";
                            answerPill.classList.remove("hidden");
                            optionButtons.forEach((optionButton) => {
                                optionButton.disabled = true;
                            });
                            return;
                        }

                        button.classList.add("incorrect");
                        button.disabled = true;
                        feedback.textContent = "Not correct. Try another option.";
                        feedback.className = "answer-feedback error";
                    });

                    optionButtons.push(button);
                    listItem.appendChild(button);
                    optionList.appendChild(listItem);
                });
            } else {
                const listItem = document.createElement("li");
                listItem.className = "option-empty";
                listItem.textContent = "No options provided for this question.";
                optionList.appendChild(listItem);
                feedback.textContent = "This question is missing options.";
                feedback.className = "answer-feedback warning";
            }

            if (!hasAnswer) {
                feedback.textContent = "Answer key not available for this question.";
                feedback.className = "answer-feedback warning";
            }

            card.appendChild(meta);
            card.appendChild(title);
            if (hasSnippet) {
                card.appendChild(snippetBlock);
            }
            card.appendChild(optionList);
            card.appendChild(feedback);
            card.appendChild(answerPill);

            questionContainer.appendChild(card);
        });

        state.visitedPages.add(currentPage);

        renderPagination({
            container: paginationContainer,
            totalPages,
            currentPage,
            visitedPages: state.visitedPages,
            onPageChange: renderQuestions
        });

        questionContainer.scrollTop = 0;
    }

    async function loadSubject(subject) {
        if (!subject) {
            titleNode.textContent = "No module available";
            descriptionNode.textContent = "No subject is enabled yet. Publish a module by setting isVisible: true in assets/js/app.js.";
            countNode.textContent = "0";
            statusNode.textContent = "No enabled module found.";
            pageIndicator.textContent = "Page 0";
            questionContainer.innerHTML = "";
            paginationContainer.innerHTML = "";
            renderTabs("");
            return;
        }

        state.currentSubject = subject;
        titleNode.textContent = subject.name;
        descriptionNode.textContent = subject.shortDescription;
        countNode.textContent = "0";
        statusNode.textContent = "Loading questions...";
        questionContainer.innerHTML = "";
        paginationContainer.innerHTML = "";
        renderTabs(subject.slug);

        try {
            state.visitedPages = new Set();

            const response = await fetch(`../${subject.dataFile}`);
            if (!response.ok) {
                throw new Error(`Failed to load ${subject.dataFile}`);
            }

            const data = await response.json();
            state.questions = Array.isArray(data.questions) ? data.questions : [];
            countNode.textContent = String(state.questions.length);
            renderQuestions(1);
        } catch (error) {
            state.questions = [];
            statusNode.textContent = "Unable to load the question file for this subject.";
            pageIndicator.textContent = "Page 0";
            console.error(error);
        }
    }

    loadSubject(getSubjectFromQuery());
});