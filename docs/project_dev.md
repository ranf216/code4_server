# Server Implementation Documentation

**Document Version:** 1.0  
**Last Updated:** 2026
**Purpose:** Comprehensive documentation of the project server business logic implementation

---




---

## Development Best Practices

For comprehensive development best practices, including database code guidelines, implementation checklists, and common patterns, see the **"Critical Rules & Best Practices"** section in `docs/brain.md`.

Key reminders:
- **Never** execute `$Db.executeQuery()` inside loops - use bulk operations with `IN` clauses
- **Never** include `SELECT` queries inside transactions - fetch all data before `$Db.beginTransaction()`
- Always use soft deletion pattern (`UPDATE SET *_DELETED_ON=?`) instead of `DELETE FROM`
- Prepare data in memory before starting transactions to minimize lock time

See `docs/brain.md` for complete guidelines, code examples, and pre-implementation checklist.
