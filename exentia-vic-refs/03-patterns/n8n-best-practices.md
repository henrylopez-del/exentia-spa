---
aliases: ["n8n Best Practices"]
---

# [[n8n]] Coding Best Practices

## Binary Data Handling

### Binary property names must match across nodes
When a Code node outputs binary data with a custom key name, every downstream node that consumes that binary **must** reference the same key name.

**Example:**
```javascript
// Code node outputs binary under key "image"
return [{
  json: { caption },
  binary: { image: await this.helpers.prepareBinaryData(buf, filename) }
}];
```
- Telegram sendPhoto node → **Input Binary Field** must be `image`, NOT the default `data`
- This applies to ANY node consuming binary (HTTP Request, Email, etc.)

**Rule:** Always check that `Input Binary Field` matches the key used in `binary: { <KEY_HERE>: ... }`.

### Default binary key is "data"
n8n defaults the binary field name to `data`. If your Code node uses a different name (like `image`, `file`, `attachment`), you MUST update it in every downstream node. Either:
1. Name your binary key `data` in the Code node to match defaults, OR
2. Update every consuming node's Input Binary Field to match your custom name

## Telegram Nodes

### sendPhoto requires binary config
When sending photos via the Telegram node using binary data:
- Operation: `Send Photo`
- **CRITICAL:** Checkbox **"Send Binary File"** (`sendBinaryData: true`) MUST be enabled
- **Input Binary Field** (`binaryPropertyName`): must match the binary key from upstream node
- Caption goes in Additional Fields
- **Both settings are required** — without `sendBinaryData: true`, the node ignores `binaryPropertyName` completely

### Common Telegram sendPhoto errors
- `"Check that the parameter where you specified the input binary field name is correct"` → Two possible causes:
  1. Binary field name mismatch — check upstream node's binary key name
  2. `sendBinaryData: true` not enabled — activate "Send Binary File" checkbox

## If Node Gotchas

### typeValidation: "loose" vs "strict"
- **"loose"**: n8n converts values before comparing. `null` can become string `"null"` → `notEmpty` check passes incorrectly
- **"strict"**: treats `null`, `undefined`, `""` as empty/falsy properly
- **Rule:** Always use `"strict"` for `notEmpty`/`empty` checks, especially when receiving data from webhooks where missing fields = `null`
- Compare with working If nodes in the same workflow before creating new ones

## General n8n Patterns

### Always validate data flow between nodes
Before deploying, click each node and verify:
1. Expressions resolve correctly (check the Result preview)
2. Binary field names match across connected nodes
3. JSON field references match the actual incoming data structure

### Code Node Tips
- Use `this.helpers.prepareBinaryData(buffer, filename)` for binary output
- Always return items in the format `[{ json: {}, binary: {} }]`
- When decoding base64 with data URI: strip the `data:...;base64,` prefix before `Buffer.from()`

## Workflow JSON Export Gotchas

### Manual UI changes may NOT appear in exported JSON
- Settings activated via checkboxes in the n8n UI (like "Send Binary File") may not be reflected when you copy/export the workflow JSON from disk
- **Always compare** the live production workflow against any JSON file you have on disk — they can diverge
- When writing workflow JSON programmatically, verify all boolean flags that correspond to UI checkboxes
- Specific example: `sendBinaryData: true` on Telegram nodes was missing from exported JSON even though it was active in production

## AI Agent Nodes

### AI must output FINAL text, never templates
When using an AI Agent node to generate messages (for Telegram, SMS, email, etc.):
- The system prompt MUST explicitly say: "Write the FINAL message using the actual values provided. NEVER use placeholders, variables, or template syntax like {{campo}}."
- Tell the AI to OMIT any field that is empty/undefined — don't show blank placeholders
- If the AI keeps generating template syntax, the system prompt is too vague

### System prompt checklist for AI Agent nodes
1. "Use the actual values I give you" — be explicit
2. "If a value is empty, skip it entirely"
3. "Output ONLY the final message, nothing else"
4. "No markdown formatting unless the target supports it" (Telegram supports limited markdown)
5. Specify tone, length, emoji usage, and what NOT to include

## See Also
- [[AEC Architecture]] — primary workflow using these patterns
- [[n8n-project-log]] — error log with real examples of these rules being violated
- [[GHL]] — downstream platform receiving n8n outputs
- [[Supabase]] — prompt storage backend queried by n8n nodes
