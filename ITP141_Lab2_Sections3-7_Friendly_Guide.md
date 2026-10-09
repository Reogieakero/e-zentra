# ITP 141 — Lab 2: OS Maintenance (Sections 3 to 7)
### Friendly Guide for Non-Techy Readers | Black & White Printable

> This guide answers Worksheet Sections 3, 4, 5, 6 and 7 in plain words.
> It follows the Step-by-Step Procedure exactly. Nothing was installed or run on your device.

- **Lab:** Lab 2 — OS Maintenance, Updates, Service Management, Four-Step SOP
- **Covers:** Section 3 Patching • Section 4 Services • Section 5 Logs • Section 6 SOP • Section 7 Reflection
- **Servers:** Windows Server 2022 + Ubuntu Server 24.04 LTS
- **Group No.:** _____________  **Date Performed:** _____________

## How to use this (30 seconds)

1. Read the **In simple words** box first.
2. Copy the tables into your worksheet.
3. Replace every `Ex:` example number (KB, count, time) with YOUR real screenshot numbers. Teacher checks screenshots.

You do NOT need to install anything from this file.

---

## Section 3 — OS Patching Summary

**In simple words:** Patching = installing safety fixes. Windows uses a menu called `sconfig`. Ubuntu uses typed commands called `apt`. This table proves both servers were updated.

**What to do:** Member 1 patches Windows. Member 2 patches Ubuntu. Take a screenshot BEFORE and AFTER.

### Non-techy translations

- `sconfig > 6 > 1` = Windows check for fixes menu, then install all quality fixes
- `Get-HotFix` = Windows receipt that lists fixes by KB number (example KB5056519)
- `sudo apt update` = Ubuntu check what fixes exist
- `apt list --upgradable + tail + wc -l` = exact count (tail removes the title line)
- `full-upgrade + autoremove` = install fixes + clean old files
- `unattended-upgrades` = automatic safety-fix installer
- `dry-run` = rehearsal that installs nothing

### Table to copy

**Windows Server 2022**

- Command used: `sconfig` > `6` Install updates > `1` All quality updates. Check with `Get-HotFix | Sort-Object InstalledOn`
- Example KBs: KB5056519, KB5059093, KB5061010 (write YOUR KBs)
- Count: Ex. 4 found, 4 installed
- Kernel: N/A (Windows uses cumulative update)
- Reboot: YES, sconfig asked to reboot, reboot done
- Screenshot: YES, before list + after list + Get-HotFix

**Ubuntu Server 24.04 LTS**

- Commands used:
  - `sudo apt update`
  - `apt list --upgradable 2>/dev/null | tail -n +2 | wc -l`
  - `sudo apt full-upgrade -y`
  - `sudo apt autoremove -y`
- Count: Ex. 32 can update, 32 upgraded, 5 old files removed. Dry-run shows 2 security fixes would install
- Kernel: YES, linux-image 6.8.0-52 upgraded
- Reboot: YES, file `/var/run/reboot-required` exists
- Screenshot: YES, apt update + upgradable list + dry-run + timers

### Ubuntu automatic updates checklist

- Install and turn on:
  - `sudo apt install unattended-upgrades`
  - `sudo dpkg-reconfigure -plow unattended-upgrades` (creates file `20auto-upgrades`)
- Allowed sources: open file `/etc/apt/apt.conf.d/50unattended-upgrades`
  - Lines with `-updates` and `-proposed` must have `//` in front (commented out)
  - Only `release`, `-security` and ESM security stay active
- Rehearsal: `sudo unattended-upgrade --dry-run --debug` shows what WOULD install but installs nothing
- Real time: `systemctl list-timers apt-daily` shows `apt-daily.timer` + `apt-daily-upgrade.timer`
- History folder: `/var/log/unattended-upgrades/`

**Common mistake:** Windows Server 2022 menu is numbered (6 then 1). Old 2019 menu with letters (A)/(R) no longer appears. Option 3 Feature updates is NOT needed.

---

## Section 4 — Service State Transition Table

**In simple words:** A service = background helper (clock, printer, scheduler, remote login). Stop = turn off. Start = turn on. Enable = start every boot. Mask = lock so it cannot start at all.

### Windows services

First list helpers: `sc query state= all` (note first 10 RUNNING).

W32Time (clock helper) is Manual / Trigger Start and often already stopped, so run `net start W32Time` first to have something to stop.

Order: `sc query W32Time` > `net start W32Time` > `net stop W32Time` > `sc query W32Time` (STOPPED) > `net start W32Time` > `sc query W32Time` (RUNNING). Write clock times.

If W32Time refuses to start, use Spooler (printer helper, always RUNNING on Desktop Experience) and write that you substituted.

| Service | At start | After Stop | After Start | End + time |
|---|---|---|---|---|
| W32Time (clock) | Manual Trigger Start, STOPPED (STATE 1). Did net start first. Ex 10:05:12 | net stop = STOPPED (STATE 1). Ex 10:06:02 | net start = RUNNING (STATE 4). No Enable on Windows. Ex 10:06:35 | RUNNING, Manual. 33 sec |
| Spooler (printer, backup) | Auto, RUNNING (STATE 4) | net stop = STOPPED | net start = RUNNING | RUNNING. ~8 sec |

### Ubuntu services — cron + SSH

List helpers: `systemctl list-units --type=service --state=running | head -15`

Use `cron` (scheduler, present on every install). Do SSH test from VirtualBox console, never from SSH itself.

| Service | At start | After Stop | Start / Mask / Recovery | End + time |
|---|---|---|---|---|
| cron (scheduler) | active (running), enabled | sudo systemctl stop cron = inactive (dead) | start + enable = active (running), enabled. Mask test: stop, mask = linked to /dev/null. start now FAILS: Unit is masked. Then unmask + start = running. Disabled = no auto-start but manual OK. Masked = cannot start at all. | active, enabled, unmasked. 3-5 sec |
| ssh.socket + ssh.service (remote login test) | socket listening on :22, service waiting (normal) | STOP BOTH: sudo systemctl stop ssh.socket ssh.service Ex 11:15:00. Proof from Windows: ssh = Connection refused. Stopping service ALONE fails, socket restarts it. | RECOVER: sudo systemctl start ssh.socket Ex 11:16:25. Proof: ssh from Windows connects again. | listening, active. Elapsed 85 sec. Write YOUR times. |

**For oral defense (1 sentence):** Disable means it will not start at boot but I can still start it by hand. Mask links it to /dev/null so it cannot be started at all until I unmask it. Masking does not stop it if already running, so I stop it first.

---

## Section 5 — Log Analysis

**In simple words:** Logs = computer diary of problems. Windows diary = Event Viewer. Ubuntu diary = journalctl. You need 3 entries from each.

### Windows — Event Viewer

Open: Windows Logs > System > Filter Current Log > tick Error + Warning > last 24 hours (if less than 3 events, widen to 7 days).

| # | ID / Level / Source | What happened | What to do |
|---|---|---|---|
| Entry 1 | 7031 / Error / Service Control Manager | Print Spooler stopped unexpectedly around patch reboot | Restart service. If once, ignore. If repeats: sfc /scannow, check KB known issues |
| Entry 2 | 10016 / Warning / DCOM | Permission denied for system component after update. Very common | Usually safe. Or grant Local Activation in Component Services. Watch if hourly |
| Entry 3 | 1014 / Warning / DNS Client | Could not reach time.windows.com while network restarted after reboot | Check cable/bridge, ipconfig /flushdns, w32tm /resync. Cleared when network returned |

### Ubuntu — journalctl

Commands:

- `sudo journalctl -p err -n 20` (screenshot)
- `sudo journalctl --since '1 hour ago' | grep -i 'err\|fail' | head -10`
- `systemctl --failed` (should show 0 failed)
- Use `grep | awk | sort | uniq -c | sort -nr` to rank most common error

| # | Unit / Level | What happened | What to do |
|---|---|---|---|
| Error 1 | sshd / err | Failed password for sysadmin from Windows IP. This is YOUR SSH test, expected | Enforce key login + Fail2Ban. No attack, one classroom host. 0 failed units |
| Error 2 | cron + apt-daily / err | apt daily job hit lock because manual full-upgrade ran at same time | Do not run apt during auto-run. Check next timer success in /var/log/unattended-upgrades/ |
| Error 3 | kernel apparmor / err | DENIED message for printer profile after kernel 6.8.0-52 upgrade, before reboot | Reboot (reboot-required file said so). After reboot cleared. Else aa-logprof |

If your numbers differ, that is normal. Keep same columns and write what YOU see.

---

## Section 6 — Patch Cycle Plan + Four-Step SOP

**In simple words:** Maintenance window = agreed sleep time for server to get fixes. Notify = who you warn. Rollback = how to undo. SOP = 4-step recipe a helper can follow alone.

### A. Maintenance window

| Item | Your plan (copy this) |
|---|---|
| When + how long | Last Saturday monthly, 22:00-02:00 (4 hours). File/print server least used Saturday night. 22:00-00:30 patch, 00:30-01:00 verify + reboot, 01:00-02:00 reserved for undo |
| Who is told, when | T-7 days: email ITSU Head + BSIT Chair + LMS post. T-3 days: reminder + change ticket. T-1 day: go/no-go. Start: chat alert going down. End: report with KBs + counts. Emergency fix: 24h notice |
| Undo plan (rollback) — keep 1/4 of window | Keep last 1 hour (01:00-02:00) empty for undo, required by Module 2 Fig 2.6. UNDO IF: service will not restart twice, systemctl --failed > 0, critical Event after patch, share unreachable. Windows undo: wusa /uninstall /kb:XXXX + restore point + reboot + check Get-HotFix. Ubuntu undo: reinstall old version + Timeshift snapshot + unmask/start cron + start ssh.socket + check journalctl. If over 1 hour, call ITSU Head and extend |

### B. The 4-step SOP — Who / What / How / Result

Note for defense: Service Design and Service Operation are ITIL v3 stages. Change Management and Release and Deployment are processes inside Service Transition. ITIL 4 calls them change enablement, release management, deployment management.

**Step 1. Prepare (Service Design)**

- WHO: Windows Lead + Ubuntu Lead + Service Manager
- WHAT: list computers, backup, warn users
- HOW: record names/IPs, sc query, systemctl list-units, apt list --upgradable, Get-HotFix, take VM snapshot + Restore Point + Timeshift, test bridge + VirtualBox console
- RESULT: checklist signed, snapshot ID saved, users warned, ready for approval

**Step 2. Assess + Approve (Change Management)**

- WHO: Log Analyst + ITSU approver
- WHAT: check risk, approve time
- HOW: read KB notes + upgradable list (kernel? reboot?), review last errors, file change request with undo plan, get signature
- RESULT: approved list of KBs/packages, reboot flag known, go/no-go

**Step 3. Apply (Release + Deployment)**

- WHO: Windows Lead + Ubuntu Lead + Service Manager
- WHAT: install fixes
- HOW Windows: sconfig > 6 > 1, record count/KBs, reboot
- HOW Ubuntu: apt update, exact count with tail/wc -l, full-upgrade -y, autoremove -y, check 50unattended-upgrades file (only security active), dry-run --debug, list-timers apt-daily
- RESULT: all fixes installed, counts logged, rebooted if needed

**Step 4. Verify + Document (Service Operation)**

- WHO: Service Manager + Analyst
- WHAT: prove healthy, file report
- HOW: sc query W32Time/Spooler, systemctl stop/start/enable + mask/unmask cron, stop ssh.socket + service = refused from Windows > start socket = reconnect + seconds, Get-HotFix, cat reboot-required file, Event Viewer filter, journalctl -p err, systemctl --failed, fill Tables 3-5, PDF to LMS
- RESULT: all RUNNING/enabled, 0 failed, 6 logs with actions, submitted

---

## Section 7 — Group Reflection (min. 100 words)

Adapt this 178-word example in your own words. Do not copy word-for-word if teacher uses plagiarism check.

> Our group learned that patching is not just clicking update but a governed cycle. Windows sconfig option 6 then 1 was simple, but recording KBs with Get-HotFix taught us traceability for ITSU audit. On Ubuntu, using tail -n +2 to get an exact upgradable count showed how a header line can falsify evidence, and the unattended-upgrades dry-run clarified what automation would do versus what it actually did, with timers proving when. The biggest insight was service recovery: disable only stops auto-start while mask links to /dev/null and blocks even manual start, and Ubuntu 24.04 SSH needs both ssh.socket and ssh.service stopped or socket activation revives it, proven by Connection refused from Windows. Log analysis linked theory to practice — Event Viewer DCOM warnings and journalctl AppArmor denials after a kernel upgrade both cleared after reboot. Writing the four-step SOP with Who / What / How / Outcome and reserving one quarter of the window for rollback made us think like operators, not just students, and sharing roles ensured any member can defend the work in the random wheel Q/A.

**Checklist:** Mention (1) Windows lesson, (2) Ubuntu lesson, (3) mask vs disable, (4) why both ssh.socket + service must stop, (5) one log lesson, (6) why 1/4 window is kept. Word Count must show 100+. Each member must explain any step. Teacher picks one speaker by random wheel, no substitution.

---

## Signatures

| Member / Role | Name + Signature | Date |
|---|---|---|
| Member 1 — Windows Patching Lead | ________________________________ | __________ |
| Member 2 — Ubuntu Patching Lead | ________________________________ | __________ |
| Member 3 — Service Manager | ________________________________ | __________ |
| Member 4 — Log Analyst + SOP Writer | ________________________________ | __________ |

**Before you submit:** Replace all Ex: with YOUR real counts, KBs, times and elapsed seconds. Attach: Windows before/after + Get-HotFix, Ubuntu apt + dry-run + timers, Event Viewer x3, journalctl x3. Submit worksheet PDF via LMS. Practice Q/A: disable vs mask? Why ssh.service alone fails? What does dry-run prove / not prove? Why keep 1/4 window?
