if not exist "docs\.rules" (
    mklink /D "docs\.rules" "C:\Development\FuzzyClick\windsurf_cascade_brain"
    echo docs/.rules >> .git/info/exclude
)
if not exist "docs\.temp" (
    mkdir "docs\.temp"
    echo. > docs/.temp/temp.md
    echo docs/.temp >> .git/info/exclude
)

if not exist ".devin" mkdir ".devin"
if not exist ".devin\rules" mkdir ".devin\rules"

if not exist ".devin\rules\00-bootstrap.md" (
    (
        echo # Bootstrap — Read First
        echo.
        echo CRITICAL: At the start of every session, you MUST directly read ALL files in the directory `@docs\.rules\devin_rules` using the read tool before doing anything else.
        echo CRITICAL: Read docs/.rules/brain.md completely before generating any code.
        echo CRITICAL: Do NOT delegate rule-reading to subagents. Read each file yourself.
        echo CRITICAL: These files may be symbolic links — they ARE accessible. Read them directly with the read tool.
        echo CRITICAL: Do NOT commit, push, or execute any Git commands that modify the repository history.
    ) > .devin\rules\00-bootstrap.md
    echo .devin/rules/00-bootstrap.md >> .git/info/exclude
)
