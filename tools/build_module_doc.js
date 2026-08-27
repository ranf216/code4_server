const fs = require("fs");
const path = require("path");

const docsRoot = path.join(__dirname, "..", "docs");
const outputDir = path.join(docsRoot, ".notebook");
const sourceFolders = ["modules", "library", "issues-questions", "code-reviews", "api", "changes-summary"];
const deferredFolder = "deferred_requirements";

function usage()
{
    console.log("\x1b[33m\x1b[1m%s\x1b[0m", "build_module_doc <module name> | -combine <output name> <module> [<module> ...] | -deferred | -general");
    console.log("  <module name>  e.g. user-mgmt, job, service_catalog");
    console.log("                 output: docs/.notebook/<module>-module.md");
    console.log("  -combine       combines several module prefixes into a single document");
    console.log("                 e.g. -combine dispatch job vehicle employee");
    console.log("                 output: docs/.notebook/<output name>-module.md");
    console.log("  -deferred      combines docs/deferred_requirements");
    console.log("                 output: docs/.notebook/deferred_requirements.md");
    console.log("  -general       copies docs/*.md and docs/.rules/brain.md as-is");
    console.log("                 output: docs/.notebook/<same file names>");
}

function normalize(name)
{
    return name.toLowerCase().replace(/_/g, "-");
}

function listMarkdownFiles(folder)
{
    const dir = path.join(docsRoot, folder);
    if (!fs.existsSync(dir))
    {
        return [];
    }

    return fs.readdirSync(dir)
        .filter((name) => name.toLowerCase().endsWith(".md"))
        .sort()
        .map((name) => ({ folder, name, full: path.join(dir, name) }));
}

function isQaFile(name)
{
    return /(^|[^a-z0-9])qa([^a-z0-9]|$)/i.test(normalize(name.replace(/\.md$/i, "")));
}

function matchesModule(fileName, moduleName)
{
    const base = normalize(fileName.replace(/\.md$/i, ""));
    if (base === moduleName)
    {
        return true;
    }

    return base.startsWith(moduleName) && /[^a-z0-9]/.test(base.charAt(moduleName.length));
}

function collectFiles(moduleName)
{
    const files = [];
    for (const folder of sourceFolders)
    {
        for (const file of listMarkdownFiles(folder))
        {
            if (isQaFile(file.name))
            {
                continue;
            }

            if (matchesModule(file.name, moduleName))
            {
                files.push(file);
            }
        }
    }

    return files;
}

if (process.argv.length <= 2 || !process.argv[2].trim())
{
    usage();
    return;
}

const arg = process.argv[2].trim();

if (arg.toLowerCase() === "-general")
{
    const generalFiles = listMarkdownFiles(".").concat(listMarkdownFiles(".rules").filter((file) => file.name.toLowerCase() === "brain.md"));

    if (generalFiles.length === 0)
    {
        console.log("\x1b[31m\x1b[1m%s\x1b[0m", "No general documentation files found");
        return;
    }

    fs.mkdirSync(outputDir, { recursive: true });
    for (const file of generalFiles)
    {
        fs.copyFileSync(file.full, path.join(outputDir, file.name));
    }

    console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Copied to: ${path.relative(path.join(__dirname, ".."), outputDir)}`);
    console.log(`Files added (${generalFiles.length}):`);
    for (const file of generalFiles)
    {
        console.log(`  - ${path.relative(path.join(__dirname, ".."), file.full)}`);
    }

    return;
}

const isCombine = arg.toLowerCase() === "-combine";
const isDeferred = arg.toLowerCase() === "-deferred";

const combineArgs = process.argv.slice(3).map((value) => value.trim()).filter((value) => value.length > 0);
if (isCombine && combineArgs.length < 2)
{
    usage();
    return;
}

const moduleName = normalize(isCombine ? combineArgs[0] : arg);
const modulePrefixes = isCombine ? combineArgs.slice(1).map(normalize) : [moduleName];

let files = [];
if (isDeferred)
{
    files = listMarkdownFiles(deferredFolder).filter((file) => !isQaFile(file.name));
}
else
{
    const seen = new Set();
    for (const prefix of modulePrefixes)
    {
        const found = collectFiles(prefix);
        if (found.length === 0)
        {
            console.log("\x1b[33m\x1b[1m%s\x1b[0m", `Warning: no documentation files found for module "${prefix}"`);
        }

        for (const file of found)
        {
            if (!seen.has(file.full))
            {
                seen.add(file.full);
                files.push(file);
            }
        }
    }
}

if (files.length === 0)
{
    console.log("\x1b[31m\x1b[1m%s\x1b[0m", `No documentation files found for "${isCombine ? modulePrefixes.join(", ") : arg}"`);
    return;
}

const outputName = isDeferred ? `${deferredFolder}.md` : `${moduleName}-module.md`;
const outputPath = path.join(outputDir, outputName);

const parts = [];
for (const file of files)
{
    const title = file.name.replace(/\.md$/i, "");
    parts.push(`# ${title}\n\n${fs.readFileSync(file.full, "utf8").replace(/\s+$/, "")}\n`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, parts.join("\n---\n\n"), "utf8");

console.log("\x1b[32m\x1b[1m%s\x1b[0m", `Created: ${path.relative(path.join(__dirname, ".."), outputPath)}`);
console.log(`Files added (${files.length}):`);
for (const file of files)
{
    console.log(`  - ${path.relative(path.join(__dirname, ".."), file.full)}`);
}
