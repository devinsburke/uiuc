@echo off

setlocal

set /p u="Your GitHub UserID: "
set /p a="Assignment (MPx.x): "

echo.
echo Create a new private GitHub repository called %a%_private (copied to clipboard).
explorer "https://github.com/new"
echo %a%_private| clip
echo.
pause

git clone --bare https://github.com/cs410assignments/%a%.git
cd %a%.git
git push --mirror https://github.com/%u%/%a%_private.git
cd ..
rd /s /q "%a%.git"

echo.
echo Assign your new repository a webhook with 'application/json' data type to:
echo http://livelab.centralus.cloudapp.azure.com/api/webhook/trigger (copied to clipboard)
echo http://livelab.centralus.cloudapp.azure.com/api/webhook/trigger| clip
echo.
explorer "https://github.com/%u%/%a%_private/settings/hooks/new"

pause

echo.
git clone https://github.com/%u%/%a%_private
explorer ".\%a%_private"
echo.
echo Done. Good luck.
echo.

pause