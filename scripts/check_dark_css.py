from pathlib import Path
path = Path('dist/assets/index-BIaZcUP1.css')
text = path.read_text(errors='ignore')
for pat in ['.dark', 'dark:bg-slate-950', 'dark:text-slate-200', 'dark:border-slate-800', 'dark:bg-slate-900', 'dark:hover:text-emerald-400']:
    print(f"{pat}: {text.count(pat)}")
