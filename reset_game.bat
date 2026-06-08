@echo off
title ⚠️ RESET DU LIEU MINIGAME
color 0C

:menu
cls
echo ===================================================
echo             CONG CU RESET SERVER BOT
echo ===================================================
echo.
echo Chon mot hanh dong:
echo [1] - Xoa TOAN BO du lieu (Tien, Vat pham, Pet, Level...)
echo [2] - Chi reset TIEN ve mac dinh 250,000 Gold (Giu nguyen do)
echo [3] - Chi reset LEVEL ve mac dinh (Level 1, 0 EXP)
echo [4] - Reset ca TIEN va LEVEL
echo [5] - Thoat
echo.
set /p choice="Nhap lua chon (1, 2, 3, 4 hoac 5): "

if "%choice%"=="1" goto reset_all
if "%choice%"=="2" goto reset_money
if "%choice%"=="3" goto reset_level
if "%choice%"=="4" goto reset_both
if "%choice%"=="5" exit
goto menu

:reset_all
echo.
echo CANH BAO: Ban dang xoa TOAN BO du lieu!
pause
del data.sqlite
echo.
echo [OK] DA XOA TOAN BO DU LIEU THANH CONG!
echo.
pause
exit

:reset_money
echo.
echo CANH BAO: Ban dang reset tien cua tat ca nguoi choi ve 250,000!
pause
node -e "const db = require('better-sqlite3')('data.sqlite'); const info = db.prepare('UPDATE users SET balance = 250000, bank = 0').run(); console.log(' [OK] DA RESET TIEN CUA ' + info.changes + ' NGUOI CHOI VE 250,000 GOLD!');"
echo.
pause
exit

:reset_level
echo.
echo CANH BAO: Ban dang reset Level va EXP cua tat ca nguoi choi ve 1!
pause
node -e "const db = require('better-sqlite3')('data.sqlite'); const info = db.prepare('UPDATE levels SET level = 1, exp = 0').run(); console.log(' [OK] DA RESET LEVEL CUA ' + info.changes + ' NGUOI CHOI VE 1!');"
echo.
pause
exit

:reset_both
echo.
echo CANH BAO: Ban dang reset Tien va Level cua tat ca nguoi choi!
pause
node -e "const db = require('better-sqlite3')('data.sqlite'); const infoMoney = db.prepare('UPDATE users SET balance = 250000, bank = 0').run(); const infoLevel = db.prepare('UPDATE levels SET level = 1, exp = 0').run(); console.log(' [OK] DA RESET TIEN VA LEVEL CUA NGUOI CHOI THANH CONG!');"
echo.
pause
exit
