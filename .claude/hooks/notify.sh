#!/usr/bin/env bash
# Send a Windows notification from WSL2 via Git Bash
"/mnt/c/Program Files/Git/bin/bash.exe" -c "
  powershell.exe -NoProfile -WindowStyle Hidden -Command \"
    Add-Type -AssemblyName System.Windows.Forms;
    \\\$n = New-Object System.Windows.Forms.NotifyIcon;
    \\\$n.Icon = [System.Drawing.SystemIcons]::Information;
    \\\$n.BalloonTipIcon = 'Info';
    \\\$n.BalloonTipTitle = 'Claude Code';
    \\\$n.BalloonTipText = 'Claude Code needs your attention';
    \\\$n.Visible = \\\$true;
    \\\$n.ShowBalloonTip(5000);
    Start-Sleep -Milliseconds 500
  \"
"
