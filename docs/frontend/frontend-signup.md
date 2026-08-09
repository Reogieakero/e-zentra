# Frontend — Creating a New Account (Sign-up)

**Status: DONE**

This is where new people make their own Zentra account. It's how a teacher,
student, or parent first comes into the system.

## What it does

- **Three kinds of accounts.** You can sign up as a **Teacher**, a **Student**,
  or a **Parent**. The form asks for the details that matter for each one:
  - Teacher: employee ID (and the details that the school needs to file them).
  - Student: grade level, LRN (learner reference number), and section.
  - Parent: relationship to the student.
- **Passwords handled safely.** The password you pick is scrambled on the
  server before being saved, so no one — not even the school's IT — can read
  your password.
- **Account approval.** New student and teacher accounts start as "pending."
  The school's office reviews and approves them before the account can be used.
  This keeps the system clean and safe.
- **Sign up with Google.** There's also a "Sign up with Google" option: you pick
  your Google account, then finish your profile to complete the sign-up.
- **Clear on-screen messages.** If something is filled in wrong, the form says
  so plainly, and the "Signed up" or error events pop a small toast message.

## What's working today

- [x] Sign up as a Teacher
- [x] Sign up as a Student
- [x] Sign up as a Parent
- [x] Review step: new accounts stay "pending" until a school admin approves
- [x] Google sign-up flow (pick Google account, then complete the profile)
- [x] Same password-safety rules as sign-in

## Things that need a real account

- [ ] Google sign-up fully switched on (needs the school's Google/Supabase keys)

Until then, the Google option may be hidden or may need configuration, and
approval e-mails need a live mailbox — but the whole screen and its server-side
rules are built and tested.