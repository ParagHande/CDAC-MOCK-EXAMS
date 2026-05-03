function paginateQuestions(questions, currentPage, questionsPerPage) {
    const totalQuestions = questions.length;
    const safePage = Math.max(currentPage, 1);
    const totalPages = Math.max(Math.ceil(totalQuestions / questionsPerPage), 1);
    const startIndex = (safePage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;

    return {
        paginatedQuestions: questions.slice(startIndex, endIndex),
        totalPages,
        currentPage: Math.min(safePage, totalPages)
    };
}

function renderPagination(options) {
    const { container, totalPages, currentPage, onPageChange } = options;

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (totalPages <= 1) {
        return;
    }

    const visited = options.visitedPages instanceof Set ? options.visitedPages : new Set();
    const maxVisiblePages = 10;

    function createPageButton(page) {
        const button = document.createElement("button");
        button.type = "button";
        const isActive = page === currentPage;
        const wasVisited = !isActive && visited.has(page);
        button.className = isActive ? "page-button active" : wasVisited ? "page-button visited" : "page-button";
        button.textContent = page;
        button.disabled = isActive;
        button.addEventListener("click", () => onPageChange(page));
        return button;
    }

    function createArrowButton(label, targetPage, disabled, ariaLabel) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "page-button page-nav-button";
        button.textContent = label;
        button.setAttribute("aria-label", ariaLabel);
        button.disabled = disabled;
        if (!disabled) {
            button.addEventListener("click", () => onPageChange(targetPage));
        }
        return button;
    }

    function createGapIndicator() {
        const gap = document.createElement("span");
        gap.className = "page-gap";
        gap.textContent = "...";
        return gap;
    }

    if (totalPages <= maxVisiblePages) {
        for (let page = 1; page <= totalPages; page += 1) {
            container.appendChild(createPageButton(page));
        }
        return;
    }

    const halfWindow = Math.floor(maxVisiblePages / 2);
    let startPage = Math.max(1, currentPage - halfWindow);
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    container.appendChild(
        createArrowButton("<", currentPage - 1, currentPage === 1, "Previous page")
    );

    if (startPage > 1) {
        container.appendChild(createPageButton(1));
        if (startPage > 2) {
            container.appendChild(createGapIndicator());
        }
    }

    for (let page = startPage; page <= endPage; page += 1) {
        if (page === 1 || page === totalPages) {
            continue;
        }
        container.appendChild(createPageButton(page));
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            container.appendChild(createGapIndicator());
        }
        container.appendChild(createPageButton(totalPages));
    }

    container.appendChild(
        createArrowButton(">", currentPage + 1, currentPage === totalPages, "Next page")
    );
}