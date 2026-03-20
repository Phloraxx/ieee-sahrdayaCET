@echo off
setlocal enabledelayedexpansion

set "filePath=C:\Users\drvij\Desktop\MuLearn Scet\IEEE\src\app\events\page_new.tsx"
set "dirPath=C:\Users\drvij\Desktop\MuLearn Scet\IEEE\src\app\events"

if exist "!filePath!" (
    del /f /q "!filePath!"
    if exist "!filePath!" (
        echo ERROR: Failed to delete the file
        exit /b 1
    ) else (
        echo SUCCESS: File deleted - !filePath!
    )
) else (
    echo File does not exist: !filePath!
    exit /b 1
)

echo.
echo Files in events directory:
for /f "delims=" %%A in ('dir /b "!dirPath!"') do (
    echo  - %%A
)
