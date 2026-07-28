if not exist "docs\brain.md" (
    mklink docs\brain.md C:\Development\FuzzyClick\windsurf_cascade_brain\brain.md
    echo docs/brain.md >> .git/info/exclude
)
if not exist "docs\code_review_checklist.md" (
    mklink docs\code_review_checklist.md C:\Development\FuzzyClick\windsurf_cascade_brain\code_review_checklist.md
    echo docs/code_review_checklist.md >> .git/info/exclude
)
if not exist "docs\api_test_guidelines.md" (
    mklink docs\api_test_guidelines.md C:\Development\FuzzyClick\windsurf_cascade_brain\api_test_guidelines.md
    echo docs/api_test_guidelines.md >> .git/info/exclude
)
if not exist "docs\audit_trail.md" (
    mklink docs\audit_trail.md C:\Development\FuzzyClick\windsurf_cascade_brain\audit_trail.md
    echo docs/audit_trail.md >> .git/info/exclude
)
if not exist "docs\code_creation_flow_and_prompts.md" (
    mklink docs\code_creation_flow_and_prompts.md C:\Development\FuzzyClick\windsurf_cascade_brain\code_creation_flow_and_prompts.md
    echo docs/code_creation_flow_and_prompts.md >> .git/info/exclude
)

if not exist ".devin" mkdir ".devin"
if not exist ".devin\rules" mkdir ".devin\rules"

if not exist ".devin\rules\01-workflow.md" (
    mklink .devin\rules\01-workflow.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\01-workflow.md
    echo .devin/rules/01-workflow.md >> .git/info/exclude
)
if not exist ".devin\rules\02-project-workflow.md" (
    mklink .devin\rules\02-project-workflow.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\02-project-workflow.md
    echo .devin/rules/02-project-workflow.md >> .git/info/exclude
)
if not exist ".devin\rules\03-style-guide.md" (
    mklink .devin\rules\03-style-guide.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\03-style-guide.md
    echo .devin/rules/03-style-guide.md >> .git/info/exclude
)
if not exist ".devin\rules\04-sql-syntax.md" (
    mklink .devin\rules\04-sql-syntax.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\04-sql-syntax.md
    echo .devin/rules/04-sql-syntax.md >> .git/info/exclude
)
if not exist ".devin\rules\05-create-api-module-doc.md" (
    mklink .devin\rules\05-create-api-module-doc.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\05-create-api-module-doc.md
    echo .devin/rules/05-create-api-module-doc.md >> .git/info/exclude
)
if not exist ".devin\rules\06-code-maintenance.md" (
    mklink .devin\rules\06-code-maintenance.md C:\Development\FuzzyClick\windsurf_cascade_brain\devin_rules\06-code-maintenance.md
    echo .devin/rules/06-code-maintenance.md >> .git/info/exclude
)
