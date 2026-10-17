"""Package the portable game and its GitHub-ready source, without local state."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root=Path(__file__).resolve().parents[1]
output=root/'output'
output.mkdir(exist_ok=True)
files=[]
for folder in ('dist','tests','scripts','.github','supabase'):
    files.extend(p for p in (root/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.extend(root/name for name in ('README.md','ART.md','package.json','pnpm-lock.yaml','server.cjs','.gitignore','Play Ink and Wonder.cmd'))
with ZipFile(output/'Ink-and-Wonder.zip','w',ZIP_DEFLATED,compresslevel=9) as archive:
    for file in sorted(files):
        archive.write(file,file.relative_to(root).as_posix())
print(output/'Ink-and-Wonder.zip')
