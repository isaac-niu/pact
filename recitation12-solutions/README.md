# 21-242 Recitation 12 solutions

LaTeX solutions for the Midterm 1 review handout.

- Combined PDF: `recitation12-solutions-all.pdf` (also in `pdfs/`)
- One PDF per question: `pdfs/01-...pdf` through `pdfs/49-...pdf`

Each writeup gives a **course-level** solution (using only ideas that belong at that point in the recitation). When a later tool (coordinates, matrices, rank-nullity, dimension counting) is shorter or clearer, an orange **later-course** box follows.

Rebuild after editing the `sec-*.tex` files:

```bash
python3 compile.py
```

The RREF computation interprets the nine stacked entries on the handout as the row-major matrix

```
[ 0 1 0 ]
[ 3 0 1 ]
[ 6 5 2 ]
```
