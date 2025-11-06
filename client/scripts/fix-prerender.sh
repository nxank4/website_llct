#!/bin/bash
# Script to add export const dynamic = 'force-dynamic' to all client pages

find src/app -name "page.tsx" -type f | while read file; do
  if grep -q "'use client'" "$file" && ! grep -q "export const dynamic" "$file"; then
    # Add export const dynamic after 'use client'
    sed -i "/'use client'/a\\
// Disable static generation for this page\\
export const dynamic = 'force-dynamic';" "$file"
    echo "Added dynamic export to: $file"
  fi
done

echo "Done!"

