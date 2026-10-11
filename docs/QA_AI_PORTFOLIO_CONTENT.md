# AI workflow and API automation content

The portfolio now highlights two ongoing initiatives: **AI-Assisted QA Workflow** and **API Automation & AI Reporting**. English copy matches the existing portfolio language. The introduction, summary, current experience, and skills describe requirement analysis, test cases, checklists, bug reporting, evidence posting, log tracing, reusable knowledge, skills and rules, Jira MCP, Teamwork CLI, Postman CLI, Newman, and Agent-assisted report analysis.

The two case studies use existing project fields and remain editable in Admin. Their benefits are qualitative; no new productivity percentages, delivery dates, client names, or benchmark results are asserted. The reviewed official CV artifacts have not been regenerated.

## Sync existing Firebase content

The source HTML and bundled fallback contain the changes. Existing Firestore documents and browser caches take precedence over bundled data.

After deploying these source files, sign in as the portfolio owner through **Admin Login**, open **Settings & sync → Data & sync**, and choose **Apply QA content update**. Once the success message appears, choose **Preview portfolio** to view the new content.

Alternatively, run this in the portfolio browser's DevTools console:

```js
const update = await import('/js/qa-content-update.js');
await update.applyQaContentUpdate();
```

The update refreshes the introduction, complete professional summary, matching current role and Postman skill, adds the AI skill category and projects, and refreshes the two QA project images. It preserves unrelated fields, existing project edits/visibility, item IDs, and section revisions. Repeating it does not duplicate additions. It uses the existing authenticated, revision-checked save path. If any result has `synced: false`, the change is pending local synchronization; reconnect and resolve pending writes in Admin before considering it published. Reload the portfolio after all five sections report `synced: true`.

For a new empty database, the existing seed tool includes the new content. Do not seed all sections over an existing customized portfolio just to apply this update.
