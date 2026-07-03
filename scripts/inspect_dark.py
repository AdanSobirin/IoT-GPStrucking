from pathlib import Path
path = Path('dist/assets/index-BIaZcUP1.css')
text = path.read_text(errors='ignore')
patterns = ['.dark', ':is(.dark', '.dark ', 'dark:bg', 'dark:text', '@media (prefers-color-scheme: dark)']
for pat in patterns:
    count = text.count(pat)
    print(f"{pat}: {count}")

# Print first occurrence of some patterns
for pat in ['.dark ', ':is(.dark', '@media (prefers-color-scheme: dark)']:
    idx = text.find(pat)
    if idx != -1:
        start = max(0, idx-120)
        end = min(len(text), idx+240)
        print('---', pat, '---')
        print(text[start:end])
    else:
        print('---', pat, 'not found ---')
