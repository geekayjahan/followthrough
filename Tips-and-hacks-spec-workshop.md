Advanced Repository Management and Model Context Protocols
Here are the additional tips and hacks from the session, focusing specifically on your GitHub integrations, advanced context hacks, Model Context Protocol (MCP), and architectural rules:
GitHub & Repository Management
Study GitHub design systems safely in fresh sessions: If you find a design system or repository on GitHub that you want to adapt, do not download it directly or clutter your workspace
1,2
. Instead, copy the GitHub URL, open a completely separate chat session, and ask Claude to "fork" (study) it there
3,4
. It will analyze the structure and tell you if it fits your build without risk of duplicating folders or breaking your active environment
4
.
Beware of automated vulnerability swarms on public GitHub: While a side project might run perfectly on your local system, pushing that repository to a public GitHub or deploying it live (e.g., on Vercel) immediately exposes it to automated swarms of attacks and scans
5,6
. Even basic, unshielded prototypes can be instantly compromised if your keys or hidden configurations are exposed
6
.
Conquer organizational resistance with a public internal Git repository: If you are rolling out a Spec-driven development framework to your enterprise team, host the Spec files in a public, internal git repository
7
. Explicitly mark designated markdown sections for specific stakeholders (e.g., security, QA, product) to input their requirements directly, turning your PRD into a collaborative, living document
7
.
Learn GitHub/Cloud deployment for job hunting: If you are looking to switch roles, setting up and managing your development environments on GitHub and the cloud is a highly sought-after skill
8
. Teams increasingly expect product managers to be comfortable navigating cloud directories rather than just operating locally
8
.
--------------------------------------------------------------------------------
Advanced Context & Session Hacks
Utilize MCP (Model Context Protocol) to fetch real-time developer docs: Stale LLM training data is a major bottleneck
9,10
. To fix this, use tools like Context 7 MCP . Instead of letting Claude guess how an API works, MCP goes directly into the live, version-specific documentation (like Shopify or Indeed) and pulls the exact current rules, schemas, and requirements .
Rename Claude Desktop chats to manage "context rot": Multi-day, complex builds generate massive numbers of chats . To prevent getting lost, rename your chats on Claude Desktop using square brackets (e.g., [Revisit - Ambiguity Audit] or [Bug Fix - Location Rule]) so you can seamlessly jump back into targeted discussions days later without repeating prompts .
Trigger "Stop and Report" during Auto-Edits: When you give the model permission to make direct changes (using auto or accept-edits mode), always instruct it to "stop and report back" the moment it finishes a specific change . This prevents the agent from running away with the code, starting extra tasks, or consuming your tokens on assumptions .
--------------------------------------------------------------------------------
Product Design & Portfolio Strategy
Steer clear of B2B for portfolio showcase apps: If you are building a prototype app to display on your GitHub for recruiters, avoid B2B use cases . Instead, build a B2C app where end-user needs are complex and relatable, and include a dedicated tab displaying your product monetization, feedback loops, and security choices .
Categorize decisions as "One-Way Doors" in your Specs: Ring-fence high-risk architectural decisions (like choosing an API or database permission layer) as One-Way Door (irreversible) decisions in your Spec blueprint . This forces the building agent to treat these choices with high friction and halt for manual confirmation .
Deploy "Five Whys" sub-agent chains for systemic debugging: If you run into complex server or build errors, don't let a single agent guess the patch . Use a Five Whys blueprint that chains five separate, fresh sub-agents to progressively dig into the root cause . Passing the output from one focused agent to the next prevents context bloat and forces a systemic architectural fix rather than a band-aid .
--------------------------------------------------------------------------------
🎨 I can synthesize this entire repository of developer-PM workflows into a highly polished, printable cheat sheet if you want a visual reference for your next spec session.
--------------------------------------------------------------------------------
Mastering AI Engineering: The Spec-Driven Development Framework
Foundational Spec Engineering & Working Backwards
Start with the absolute "first principle" of your feature: Before writing a single line of a Spec or PRD, you must clearly articulate what problem you are solving, who you are solving it for, and why
1
. If that core business justification doesn't exist, the PRD shouldn't either
1
.
Explicitly define what is out of scope: When drafting your Spec, make sure to detail what the app will not do
2
. Advanced LLMs are highly prone to "rushing to the goal" and over-engineering features, so ring-fencing what is out of scope prevents the model from generating unnecessary "garbage"
2,3
.
Place your architectural blueprint directly in the Spec: Document your entire system architecture—including data sources, connectors, APIs, security layers, and front-end layouts—in the Spec file
4,5
. If you need to make system changes later, edit this Spec file rather than manually modifying the final output files
5
.
Enforce "checkpoints" to curb overconfidence: AI models naturally try to sprint to the end of a task, which degrades output quality
3,6
. Build strict, sequential checkpoints into your specs that force the agent to halt, verify its steps, and get user confirmation before moving forward
3,6
.
Use explicit "handoff" files across sessions: While a Claude.md file tracks global project memory, it is often not updated or gets bloated
7,8
. When taking breaks or switching between multiple sessions, create dedicated handoff files with context of what has happened so far so the new agent session can resume accurately
9
.
--------------------------------------------------------------------------------
Prompts, Submodels, and Context Management
Force the model to thoroughly "interview" you first: Never let Claude generate a Spec based on a single prompt
10
. Force it to interview you about your target audience, edge cases, and its own logical ambiguities
10,11
. If you do not resolve these ambiguities upfront, the model will silently make incorrect assumptions
10
.
Use the word "spirals" to break infinite loops: If you notice Claude is going in circles, constantly finding new conflicts, or rewriting its own Spec, explicitly type the word "spirals" in your prompt
12
. Tell it: "You're going in spirals, let's get to a clean spec and move to the build"
12
.
Re-test your instructions on every model upgrade: Every model upgrade behaves differently. Opus 5's habit was over-engineering (twenty tasks when given one); Opus 5.5 overreaches less, but still makes eager edits when you ask it a "why" question. The wording that holds is a scope line in CLAUDE.md, not "don't act too smart": "Deliver what I ask for, at the scope I intend. If the ask looks wrong, say so in a sentence and keep going as asked."
.
Turn effort up before you switch models: Opus 5.5 starts at medium effort, and the newest model at lower effort usually beats an older model at high effort. The kit's skills pin their own effort; outside a skill, type /effort high for anything that reads more than it writes. For cheaper background work, set model: haiku (Haiku 5.5) on a subagent for reads and summaries, and Sonnet 5.5 when a worker needs judgment.
.
Keep your custom skills context-light: Custom skills are incredibly useful for running repeatable tasks (like writing documentation or executing error-handling loops)
19,20
. However, because skill metadata loads at the start of every single new session, keep skill descriptions highly optimized and context-light to avoid burning your token budget
21
.
--------------------------------------------------------------------------------
Data & File Optimization
Format your spreadsheets as JSON first: If your application relies on Excel sheets or tabular datasets, convert those files to JSON format before feeding them to Claude
22
. JSON is dramatically cheaper, faster, and easier for LLMs to read than native spreadsheets
22
.
Prioritize Markdown over Word docs and PDFs: When providing resources or documentation to your agents, convert PDFs and Word documents into .md format
23
. Word documents and PDFs are highly computationally expensive and complex for AI agents to process compared to lightweight Markdown
23
.
--------------------------------------------------------------------------------
Evals, Bar Raisers, and Observability
Run a completely fresh "Ambiguity Audit" in a clean session: Once your Spec is generated, copy it and open a completely new session with a new agent to audit it
24,25
. After a long spec-building session, the original agent becomes overconfident and assumes all its assumptions are flawless
25
.
Only use strict "binary" evaluations (0 or 1): Avoid Likert scales (e.g., grading from 1 to 5) when testing your app
26,27
. Because non-deterministic LLMs are inherently sycophantic, they will always over-inflate their own scores when grading themselves
26,28
. Forcing a binary choice forces the model to take the safest, most accurate grading option
27,28
.
Design a "Bar Raiser" evaluation rubric: Rather than general testing, structure your evaluation panel around virtual independent stakeholders who have no vested interest in the build (such as a virtual QA Engineer, Security Architect, or Customer Sense advocate)
29−31
. If even one stakeholder flags a "zero," the build fails
32,33
.
Use fresh sub-agents for individual eval checks: To prevent context contamination and sycophancy, run every single evaluation check using a completely independent, fresh sub-agent
32,34
.
Build a local dashboard to master complex AI concepts: When trying to learn a complex new architecture (such as LangFuse, loop engineering, or advanced RAG), instruct your agent to build a simple local dashboard prototype first
35,36
. Understanding the underlying code logic on a lightweight, local UI makes transitioning to massive enterprise observability platforms far easier
36,37
.
--------------------------------------------------------------------------------
Debugging, Security, & Team Collaboration
Use a continuous progress log as a "change map": Always maintain an active progress.log or activity map of every spec and code change
38
. When debugging, point Claude directly to this change map so it can surgically patch errors rather than sweeping and rewriting your entire codebase, which inevitably introduces new bugs
38,39
.
Keep all secrets in .env and strictly out of chats: Never paste raw API keys, credentials, or secrets in a chat window
40,41
. Put them strictly inside a hidden .env file, which Claude is restricted from exposing, to protect your local environment from vulnerabilities
42
.
Be highly skeptical of third-party skills: Avoid downloading global skills from untrusted repositories (like unverified skills.sh files)
43
. Downloading a custom skill essentially places an active, executable file directly on your computer, making you highly vulnerable to security exploits
43
.
Provide engineers with an interactive Build Assistant: Instead of handing engineering partners endless Markdown files or JIRA tickets, host a shared, lightweight Build Assistant dashboard ****. It allows them to view the complete history of background agent activities, code logs, and test cases in a visual, color-coded interface ****.
--------------------------------------------------------------------------------
Career & AI Product Management (PM) Habits
Speak to your LLM using voice dictation: Use voice typing instead of manual typing to prompt your models ****. Voice forces you to articulate your product reasoning and explain complex customer problems much better than typing does ****.
Stand out by owning the "model wiki": In enterprise AI environments, you don't need to be the engineer
44
. You can stand out by taking full ownership of internal "model wikis," newsletters, and internal communications so that non-technical business stakeholders can easily understand the model's behavior
45
.
Overcome enterprise resistance with shared Spec repos: If you face pushback when rolling out AI features in your company, create a public, internal git repository for your Specs
46
. Clearly mark specific sections for different collaborative stakeholders (security, business, engineering) to input their requirements
7,46
.
Build a "Docs" tab into your portfolio apps: When building B2C prototype apps to showcase to recruiters, add a dedicated "Docs" page or a miniature RAG system that answers questions about your project Spec
47,48
. This visually demonstrates your structured product thinking and documentation skills in a highly interactive way
48
.
--------------------------------------------------------------------------------
🧩 I can compile all of these architectural rules and hacks into a clean Markdown cheat sheet, or even generate an editable presentation template you can use to pitch this Spec-driven development framework to your team.
--------------------------------------------------------------------------------
The Architect's Handbook for AI Development workflows
Pacing, Energy, and Session Management
Take breaks and split up your sessions: Reworking a spec mid-build is incredibly expensive, so take your time at the start
1
. You should take breaks and even spend up to 5 days refining your spec before starting the actual build
1,2
.
Limit your daily focus time: Working with AI is mentally draining
3,4
. Instead of trying to build everything at once, break your sessions across multiple days, and dedicate just one hour every day at your best focus times
3,4
.
Model Selection, Submodels, and System Instructions
Re-test system instructions on each new model: Every model upgrade has a different "personality". Opus 5 was prone to over-engineering; on Opus 5.5 re-test rather than assume, and keep a one-line scope rule in CLAUDE.md so the model says when an ask looks wrong instead of quietly changing it.
.
Tailor system instructions to your specific background: If you want to prevent verbose, conversational clutter, instruct the model that you are a non-technical PM so it communicates in clear business terminology rather than burying you in technical build jargons
6,7
.
Use Fable for auditing codebases: While you might use Opus 5.5 for speccing, building and handling ambiguities, open a completely new session with Fable 5.1 (or run /code-review high) when you need to audit your codebase or surgically debug. Finding bugs is its measured strength.
.
Pick effort before model: To speed up a task, lower the effort or hand it to a subagent on Haiku 5.5. Older models like Opus 4.8 or 4.6 are no longer the fast option, and staying on one model keeps one prompt cache.
.
Say what done looks like, then let it run: Interactive sessions now start in auto mode, so your brake is the instruction, not the permission prompt. Tell it: "Stop and ask only when you can't continue without me, or before anything destructive." The kit's checkpoints are the stops it should keep.
.
Managing Prompts, Loops, and "Spirals"
Interviewing is the golden rule: Before letting the model write a spec, force it to interview you thoroughly about the problem, the hard parts, and its own ambiguities
11,12
. If you don't answer these questions upfront, the model will just make incorrect assumptions on its own
12
.
Call out "spirals" directly: If you notice the model is going in circles or constantly finding new conflicts, use the word "spirals" in your prompt
13
. Tell it: "You're going in spirals, let's get to a clean spec and move to the build"
13
.
Keep control of conflict resolution: Don't let the model make executive decisions on its own
14
. Instruct it to ask the user questions and resolve conflicts manually through you so you retain product judgment
14
.
Coordinate multi-session builds: When running a build across separate sessions, always explicitly inform the model what is happening in the background (e.g., "I'm starting the build on another session, FYI, but only plan mode")
15,16
. If you don't coordinate, the model will watch the directory, guess, and conflict with your manual edits
16
.
Security, Secrets, and API Key Safety
Never paste API keys or secrets in the chat: This is the easiest way to expose your system to attacks
17,18
. Instead, keep all secrets in a hidden .env (environment) file which Claude is restricted from exposing
19,20
.
Practice good key hygiene: Always rotate or refresh your API keys regularly
21
. Additionally, generate unique API keys for each application you build so you can track token usage and isolate access
22
.
Avoid API key verification in evals: Do not write evaluation tests to check if your API keys are working properly; doing so accidentally exposes your secret keys in a roundabout way
23
.
Be highly skeptical of third-party skills: Never download skills from untrusted external sources
24
. Downloading a skill essentially places an active file on your computer, leaving you vulnerable to security risks
24
. Stick strictly to Anthropic-recommended skills
24
.
Optimizing Context, Markdown, and Files
Keep skill metadata optimized: Master the art of managing Claude.md (your persistent memory file)
25
. Keep skill files and metadata context-light and highly optimized because their descriptions load every time you open a new session, which burns through your tokens
25,26
.
Convert structured data to JSON first: If you are working with spreadsheets or Excel data, convert them into JSON files first
27,28
. Models find JSON much easier and cheaper to read
27,28
.
Prioritize Markdown over PDFs/Word docs: Markdown files are the doc format that agents can read most efficiently
29
. Reading PDFs or Word documents is much more complex and computationally expensive for the system
29
.
General AI Working Habits
Use voice instead of typing: Whenever possible, use voice dictation to talk to your LLM . Voice forces you to articulate your product thinking and explain your reasoning much better than typing does .
Learn new concepts via local dashboards: If you want to learn a complex new tool or concept (like LangFuse or loops), ask the model to build a local dashboard prototype first
30,31
. Understanding the underlying code logic on a simple, local dashboard makes it much easier to transition to advanced enterprise platforms later
30,31

Github repo suggestion to use for a design system (you can ask claude to get a copy of this and use it in your build): https://github.com/shadcn-ui/ui

Skills repo: https://www.skills.sh/
Anthropic's frontend designs skills: https://www.skills.sh/anthropics/skills/frontend-design

Use only relaible sources such as Anthropic and Vercel.