# Frontend — Logging In

**Status: DONE**

This is the part of the website that lets people sign in. It is the front door
of Zentra — everyone enters here.

## What it does

- **Choose who you are.** The sign-in page offers three doors: **Student**,
  **Parent**, and **Staff**. Each door asks for the right kind of account.
- **Email + password sign-in.** Enter your school email and password to get in.
- **Sign in with Google.** There is also a "Sign in with Google" button. When
  the school has Google sign-in switched on, it appears automatically; when it
  is not configured, the button hides itself so the page never looks broken.
- **Forgot password.** If you can't remember your password, you can ask for a
  reset link by email. The link is time-limited and can only be used once.
- **Reset password.** After following the reset link, you pick a strong new
  password. Signing in with the old one no longer works afterwards.
- **Session safety.** If you step away and the page sits idle, Zentra asks
  "Are you still there?" with a countdown — you can say "I'm still here" to
  stay signed in, or it signs you out automatically so an unattended screen
  can't be misused.

## What's working today

- [x] Student sign-in
- [x] Parent sign-in
- [x] Staff sign-in (teachers, registrar, record keeper, principal, and other office roles)
- [x] Forgot-password request by email
- [x] Reset-password with a new password
- [x] Google sign-in button (appears only when the school enables it)
- [x] Idle / inactivity warning with countdown
- [x] Wrong-password protection (too many mistakes slows the account down briefly)

## Things that need a real account

The screens are complete, but some features need the school's live settings to
actually reach a real email inbox or Google:

- [ ] Reset emails reaching a real mailbox (needs a live email/SMTP account)
- [ ] Google sign-in fully switched on (needs the school's Google/Supabase keys)

Until those are configured, the on-screen experience is fully built and the
server-side rules are tested — they just need the live connection to go live.