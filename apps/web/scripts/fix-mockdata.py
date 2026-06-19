#!/usr/bin/env python3
import re
from pathlib import Path

path = Path('/home/nan/agentos-owl/apps/web/src/data/mockData.ts')
text = path.read_text(encoding='utf-8')

# Insert daysAgo helper after imports
text = text.replace(
    "from '../types';\n",
    "from '../types';\n\nconst daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);\n",
    1
)

# Helper to add fields to each object in an array block
def patch_array_block(text, array_name, fields):
    # Find the array: export const X: Type[] = [
    start_marker = f"export const {array_name}:"
    start = text.find(start_marker)
    if start < 0:
        return text
    # Find the opening bracket
    bracket = text.find('[', start)
    # Find the closing ]; (the matching end of the array)
    # We scan for ]; at the same indent as the array declaration
    end = text.find('];', bracket)
    if end < 0:
        return text
    block = text[bracket:end+2]
    
    # Split into top-level objects. We identify object boundaries by lines with `  },` or `  }`
    lines = block.split('\n')
    new_lines = []
    inside_object = False
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Detect start of an object: line is "  {"
        if stripped == '{':
            inside_object = True
            new_lines.append(line)
            continue
        # Detect end of object
        if inside_object and (stripped == '},' or stripped == '}'):
            # Insert fields with proper indent (4 spaces)
            for f in fields:
                new_lines.append('    ' + f)
            inside_object = False
        new_lines.append(line)
    new_block = '\n'.join(new_lines)
    return text[:bracket] + new_block + text[end+2:]

# Patch each array
text = patch_array_block(text, 'CONVERSATIONS', [
    "createdAt: daysAgo(1),",
    "updatedAt: new Date(),",
])

text = patch_array_block(text, 'KANBAN_TASKS', [
    "createdAt: daysAgo(7),",
    "updatedAt: new Date(),",
])

text = patch_array_block(text, 'WORKFLOW_TEMPLATES', [
    # already has createdAt/lastRun
])

text = patch_array_block(text, 'KNOWLEDGE_DOCS', [
    # already has createdAt
])

text = patch_array_block(text, 'MARKET_TOOLS', [
    "createdAt: daysAgo(90),",
    "updatedAt: daysAgo(10),",
])

text = patch_array_block(text, 'TEAM_TEMPLATES', [
    "createdAt: daysAgo(60),",
    "updatedAt: daysAgo(10),",
])

text = patch_array_block(text, 'BILLING_DATA', [
    "createdAt: daysAgo(7),",
])

text = patch_array_block(text, 'NOTIFICATIONS', [
    # already has timestamp
])

path.write_text(text, encoding='utf-8')
print('mockData.ts patched')
