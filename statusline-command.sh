#!/bin/bash
# Claude Code status line: model name + context usage progress bar

input=$(cat)

model=$(echo "$input" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);process.stdout.write(j.model?.display_name||'unknown')})")
used=$(echo "$input" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const u=j.context_window?.used_percentage;process.stdout.write(u===undefined||u===null?'':String(u))})")

# Build a 10-segment progress bar
bar_width=10
if [ -n "$used" ]; then
  used_int=$(printf '%.0f' "$used")
  filled=$(( used_int * bar_width / 100 ))
  [ "$filled" -gt "$bar_width" ] && filled=$bar_width
  empty=$(( bar_width - filled ))

  bar=""
  i=0
  while [ "$i" -lt "$filled" ]; do bar="${bar}#"; i=$((i+1)); done
  i=0
  while [ "$i" -lt "$empty" ]; do bar="${bar}-"; i=$((i+1)); done

  printf '\033[36m%s\033[0m \033[2m[\033[0m%s\033[2m]\033[0m %s%%' "$model" "$bar" "$used_int"
else
  printf '\033[36m%s\033[0m \033[2m[context: n/a]\033[0m' "$model"
fi
