# A personal assistant people can trust to finish work

Prepared October 12, 2026. This is a product thesis and implementation proposal, not a claim that the named competitors have demonstrated defects.

## Research status and comparison

The requested category is bots that automate tasks, manage schedules, and interact with web services or messaging apps. That description does not uniquely identify Muse. Poke is a candidate direct competitor, but requests to its website were denied by the environment network proxy. Requests to Lindy and Motion were denied too. Do not treat any proposed gap below as a verified absence in those products.

Official repository READMEs for n8n and Activepieces were successfully retrieved. Their feature statements are publisher claims, not independent functional tests. Both already advertise human approval; adding an approval button alone is not defensible differentiation.

| Product | Relationship to the idea | What is actually established | What still needs checking |
| --- | --- | --- | --- |
| Muse | Requested direct competitor, identity unresolved | The user described the category, without a product URL | Exact vendor, channels, integration list, approval rules, reliability, privacy, pricing |
| Poke | Requested assistant competitor; provisional candidate website: poke.com | The website could not be retrieved in this environment | Verify product identity, onboarding, messaging channels, scheduling, integrations, actual execution and recovery |
| Lindy | Candidate adjacent assistant/workflow competitor | No product features verified in this run | Current agents, calendar/mail support, approval and recovery experience, pricing |
| Motion | Candidate adjacent scheduling competitor | No product features verified in this run | Exact scheduling scope and how it handles constraints and conflicts; it may not be a general messaging bot |
| n8n | Adjacent workflow/agent platform, not the same consumer experience | Official README describes a visual canvas, custom code, AI tools, human approvals, observability, integrations, self-hosting, and cloud hosting | Consumer setup friction and connector reliability need hands-on tests; README cannot establish these |
| Activepieces | Adjacent workflow platform, not an exact substitute | Official README describes TypeScript integrations, AI pieces, MCP exposure, human approvals, chat/form inputs, retries, branches, and versioned flows | Ease of personal scheduling, account onboarding, and recovery from partial external writes require testing |

Sources accessed October 12, 2026:

1. [n8n official README](https://github.com/n8n-io/n8n/blob/master/README.md), retrieved through [raw GitHub content](https://raw.githubusercontent.com/n8n-io/n8n/master/README.md).
2. [Activepieces official README](https://github.com/activepieces/activepieces/blob/main/README.md), retrieved through [raw GitHub content](https://raw.githubusercontent.com/activepieces/activepieces/main/README.md).
3. Attempted but inaccessible: https://poke.com, https://www.lindy.ai, https://www.usemotion.com. These attempts provide no evidence of their product behavior.

The sources are moving branch references, so later content may differ. Two Muse-like domain guesses were attempted but identify no verified vendor; they are not evidence about Muse. Competitor defect claims must wait for precise URLs and accessible source material or authorized hands-on evaluation.

## The strongest starting product

Build a scheduling and follow-up assistant for independent consultants and small client-service teams. Start with one calendar provider and one email provider. This is a proposed customer segment, not validated market demand. The recurring job is coordinating a meeting, keeping the thread moving, and knowing whether the action actually happened.

The useful promise: **“You can see what will happen, why it was proposed, and whether it succeeded.”** A chat surface can collect requests, while the command center makes status and approvals visible. The visual ring is a status landmark, not a claim of autonomous intelligence or a substitute for actionable controls.

Do not start by supporting every messaging app. SMS has cost and consent requirements; WhatsApp needs supported business APIs; availability of iMessage automation must be confirmed through a supported integration rather than assumed. Gmail and Google Calendar provide a narrower first release.

## Problems to validate, and the improvements to build

These are category-level failure hypotheses. Each needs evidence from real users and specific competitors before calling it a major problem in Muse or Poke.

| Failure hypothesis | Concrete improvement | How to demonstrate value |
| --- | --- | --- |
| Users cannot tell whether a bot suggested an action or completed it | Distinct planned, approved, running, verified, and failed states; show provider receipts | Reconcile app results against provider records and count false success reports |
| A request is misunderstood or important details are silently guessed | Structured plans with recipients, times, timezone, source evidence, and unresolved fields; ask targeted questions | Track corrections before execution and wrong-recipient/time incidents |
| Partial failures produce duplicates or silent abandonment | Idempotent actions, durable retries, provider reconciliation, and a recovery queue | Force a timeout after provider success and verify that retry does not send/create twice |
| Broad account access makes users uneasy | Minimum OAuth scopes, readable permission controls, disconnect, export, delete, and a clear retention policy | Measure completion of connection setup; test revocation and data deletion behavior |
| Scheduling wastes time through conflicts and timezone mistakes | Fresh free/busy lookup, buffers, working hours, explicit timezone, ranked slots, and a final availability check | Track rejected slots, schedule conflicts, and successful bookings per attempted booking |
| Users must rebuild the same instruction repeatedly | Explicitly saved preferences with source, scope, expiry, and user editing | Compare setup effort and corrections with/without saved preferences |
| Automation requires too much workflow-builder knowledge | Three guided workflows with plain-language preview and defaults | Compare successful first workflows and time to first verified outcome |

Approval, retries, and observability are already advertised by the verified adjacent platforms. The opportunity is to integrate them into an easier personal workflow, make outcomes verifiable, and perform well on measured coordination tasks. A feature list alone will not establish superiority.

## How to evaluate the precise competitors

After confirming product URLs and getting site access, use sandbox accounts owned by the tester. Avoid real recipients and financial transactions. Record plan/version, source, date, and screenshots where permitted.

Run the same scenarios on each relevant product:

1. Schedule a 30-minute meeting across two timezones with a buffer and a conflicting calendar event.
2. Ask an ambiguous question with two possible recipients. Check whether it clarifies.
3. Draft a follow-up, change the recipient, and verify whether approval is invalidated.
4. Disconnect the mail integration before execution. Check the error and recovery path.
5. Cause a timeout after a successful test write. Check for duplicate delivery on retry.
6. Change calendar availability after approval. Check whether the assistant revalidates.
7. Revoke permissions and request deletion/export. Verify actual effects and published retention terms.

Score each scenario for correctness, completion, user corrections, duplicate actions, recovery effort, and traceability. Do not label a feature missing merely because it is absent from a landing page. Inspect documentation and test the relevant tier. Pricing comparisons need current plan limits and matched usage, not just headline subscription prices.

## Roadmap and release gates

The current repository implements a visual local prototype, approval state transitions, deterministic planning, simulated connector failure/recovery, local persistence, and scheduler tests.

Next build a single-user live calendar read integration, then an approved calendar write with provider receipts. Only afterward add approved email sending. A small internal pilot should come before broad distribution. Expansion to other providers should follow evidence that the first workflow reliably saves users work.

Proposed pilot gates, not measured results: every external write links to an approved plan version; no duplicate writes in the fault-injection suite; no false success report in the evaluation set; timezone/conflict cases pass; expired authorization fails visibly; revocation and deletion tests pass. Define success rate as verified completed tasks divided by all eligible attempted tasks, and report blocked, rejected, and abandoned tasks separately.

The current prototype cannot establish market demand, production reliability, or superiority over Muse/Poke. Interviews, matched competitor tests, and a pilot are the next evidence needed.
