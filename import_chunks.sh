#!/bin/bash
# Feed split SQL chunks into Turso sequentially (avoids the 189MB single-stream 502).
export PATH="$HOME/.turso:/opt/homebrew/bin:$PATH"
cd "/Users/brianeedsleep/Documents/untitled folder/findperfume" || exit 1
DB=findperfume
i=0
fail=0
for f in _chunks/chunk_*; do
  i=$((i+1))
  # retry each chunk up to 3x
  ok=0
  for attempt in 1 2 3; do
    if turso db shell "$DB" < "$f" > /tmp/chunk_out.log 2>&1; then
      ok=1; break
    fi
    sleep 3
  done
  if [ "$ok" = 1 ]; then
    echo "chunk $i/$(ls _chunks | wc -l | tr -d ' ') OK"
  else
    echo "chunk $i FAILED: $(tail -1 /tmp/chunk_out.log)"
    fail=$((fail+1))
  fi
done
echo "DONE. failed=$fail"
