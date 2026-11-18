@echo off
cd /d "D:\CODE\4.Auto VCX"
"C:\Program Files\nodejs\node.exe" scripts/backup_gdrive.js >> "D:\CODE\4.Auto VCX\DATABASE BACKUP\gdrive_backup.log" 2>&1
