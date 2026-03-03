# How AI Career Copilot Works

*A plain-language guide for anyone curious about what this tool does and how it does it — no technical background needed.*

---

## What Is This Tool?

AI Career Copilot is a web application that helps job seekers prepare for their job hunt in two ways:

1. **Resume analysis** — Upload your resume and instantly find out how well it matches common tech roles, what skills you have, and what skills you might be missing.

2. **Interview practice** — Get a set of questions tailored to the role you are targeting, answer them in writing, and receive instant AI feedback on each answer.

Everything runs privately on your own computer or server. Your resume is never sent to a third-party cloud AI service.

---

## The Big Picture

Here is the overall journey from the moment you open the app to getting your results:

```
You open the app
       |
       v
   Log in securely
       |
       v
   Upload your resume (PDF or Word document)
       |
       v
   The app reads your resume and analyses your skills
       |
       v
   You see your results:
     - ATS readiness score
     - Skills the app found
     - Roles that match your profile
     - Skills you are missing
       |
       v
   Start an interview practice session
       |
       v
   Answer 5 questions about your target role
       |
       v
   Get a score and written feedback on each answer
```

---

## Step 1 — Logging In

When you create an account your password is scrambled using an industry-standard one-way process before it is saved. The original password is never stored anywhere. When you log back in, the app checks the scrambled version — it never unscrambles or reads the plain password.

Once you log in you receive a small invisible "session pass" that your browser holds onto. Every time you do something in the app — upload a file, request analysis, answer a question — this pass is sent automatically so the app knows it is really you. The pass expires after 24 hours, after which you will need to log in again.

```
You enter email + password
         |
         v
App checks password (never reads plain text)
         |
    Match? Yes
         |
         v
App gives your browser a session pass
(stored invisibly — JavaScript cannot read it)
         |
         v
Pass travels with every action you take
```

---

## Step 2 — Uploading Your Resume

You can upload a PDF or Microsoft Word (DOCX) file up to 5 MB. Before doing anything with the file, the app performs two safety checks:

1. **File type check** — looks at the actual content of the file (not just the file name) to make sure it really is a PDF or Word document
2. **Size check** — rejects anything over 5 MB

Your file is saved on the server under a randomly generated name (not your original file name) so there is no risk of one user's files interfering with another's.

```
You choose a file
         |
         v
App checks: is it really a PDF or Word doc?
         |
         v
App saves file under a random code name
(e.g. "a3f8c2...pdf" instead of "my_resume.pdf")
         |
         v
App reads all the text out of the file
```

---

## Step 3 — Analysing Your Resume

This is where the AI part starts. The app uses two models that run locally on your machine:

### What happens

```
Your resume text
       |
       v
  Language model reads the text
  and identifies words and phrases
       |
       v
  Each phrase is turned into a set of numbers
  that represents its meaning (an "embedding")
       |
       v
  Those numbers are compared against
  a library of 30 known technical skills
       |
       v
  Skills that are close enough in meaning
  are counted as a match
       |
       v
  Matched skills are compared against
  10 common tech roles to find the best fits
       |
       v
  Results are saved and shown to you
```

### What you get

**ATS Score** — "ATS" stands for Applicant Tracking System, the software many companies use to filter resumes before a human sees them. Your ATS score (0 to 100) is a rough measure of how many relevant skills the app found in your resume compared to the full skill library.

**Detected Skills** — The skills the app found, each with a confidence percentage. A skill at 0.61 confidence means the resume text was a strong match for that skill's meaning.

**Role Matches** — Which of the 10 target roles your skill set aligns with most, ranked from highest to lowest match.

**Gap Skills** — Skills that are commonly expected for your target roles but were not detected in your resume. These are your study priorities.

---

## Step 4 — Practising Your Interview

Once you have your analysis results you can start a practice interview session for any role.

### Generating questions

```
You pick a target role
         |
         v
App sends your skills + the role name
to a locally-running AI (called Ollama)
         |
         v
The AI generates 5 interview questions
specific to your role and skill profile
         |
         v
Questions are saved and shown to you one by one
```

If the AI is not available (for example, if the Ollama service has not started yet), the app falls back to a set of general-purpose questions so you can still practise.

### Answering and getting feedback

```
You read a question and type your answer
         |
         v
App sends the question + your answer
to the AI for evaluation
         |
         v
AI grades your answer on a scale of 0 to 10
and writes personalised feedback
         |
         v
AI also provides an example ideal answer
         |
         v
You see your score, the feedback,
and the ideal answer side by side
```

Each question can only be answered once per session — the app will not overwrite an answer you have already submitted.

---

## What the App Stores About You

The app stores only what it needs to show you your results:

| What is stored | Why |
|----------------|-----|
| Your name, email, and scrambled password | To let you log in |
| The text extracted from your resume | To run the skill analysis |
| Your ATS score, skills, role matches, gap skills | To show you your results |
| Interview questions and your answers | To show your practice history |
| Your scores and feedback | To show your performance |

Your resume file is stored on the server's disk. It is never sent to any external service. The AI models (for NLP and interview coaching) all run locally.

---

## What Happens When You Delete a Resume

When you delete a resume, all linked data is removed at the same time:

```
You click Delete on a resume
         |
         v
Resume record is deleted from the database
         |
         v
Analysis results are deleted automatically
         |
         v
Any linked interview sessions and answers
are deleted automatically
```

---

## What the AI Can and Cannot Do

**Can do:**
- Detect technical skills in resume text with reasonable accuracy
- Match your skill profile to common tech job roles
- Generate relevant interview questions for a given role
- Score written answers and explain what was good or missing

**Cannot do:**
- Guarantee a job interview — it is a practice and self-assessment tool
- Analyse soft skills, formatting quality, or visual layout
- Read scanned images inside a PDF (only actual text is processed)
- Access the internet or any external database

---

## The Technology Behind It (Plain Version)

| Piece | Plain description |
|-------|------------------|
| React | The visual interface you see and click |
| FastAPI | The engine that handles your requests behind the scenes |
| SQLite / PostgreSQL | The filing cabinet that stores all your data |
| spaCy | A language tool that reads and tokenises your resume text |
| Sentence-Transformers | Turns text into comparable numbers to measure meaning similarity |
| Ollama (Llama 3) | A locally-running AI assistant that writes questions and feedback |
| Docker | Packages everything together so it runs the same on any computer |

---

## Privacy Summary

- Your data stays on the machine running the app
- No resume text or answers are sent to OpenAI, Google, or any cloud service
- Passwords are never stored in readable form
- Session tokens expire after 24 hours
- You can delete your resumes at any time
