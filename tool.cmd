@echo off
setlocal enabledelayedexpansion

if "%~1"=="" (
    echo Available tools:
    for %%f in (tools\*.js) do (
        set "filename=%%~nf"
        powershell -Command "Write-Host '  !filename!' -ForegroundColor Yellow"
    )
    exit /b 0
)

set "TOOL_NAME=%~1"
set "TOOL_PATH=tools\%TOOL_NAME%.js"

if not exist "%TOOL_PATH%" (
    powershell -Command "Write-Host 'Error: Tool ''%TOOL_NAME%'' does not exist.' -ForegroundColor Red"
    echo.
    echo Available tools:
    for %%f in (tools\*.js) do (
        set "filename=%%~nf"
        powershell -Command "Write-Host '  !filename!' -ForegroundColor Yellow"
    )
    exit /b 1
)

shift
set "PARAMS="
:loop
if "%~1"=="" goto endloop
set "PARAMS=%PARAMS% %1"
shift
goto loop
:endloop

cd tools
node %TOOL_NAME%.js%PARAMS%
