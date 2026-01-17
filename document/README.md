# AgriConnect Documentation

This repository houses the formal documentation set for the AgriConnect platform. All content is tailored for LaTeX compilation via `main.tex`.

## Structure
- `main.tex`: Root document that stitches together every section.
- `sections/`: Contains individual chapter files (`01-abstract.tex` .. `09-conclusion.tex`).
- `images/`: Stores architectural and design diagrams referenced throughout the document.
- `references.bib`: BibTeX database for citations.

## Getting Started
1. Edit each section file with the relevant content.
2. Place diagram assets inside `images/` and update the LaTeX references accordingly.
3. Compile with your preferred LaTeX workflow (e.g., `pdflatex` followed by `biber` and `pdflatex` twice).
