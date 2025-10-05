#!/bin/bash

# Date to set for commits (August 20, 2025)
TARGET_DATE="Wed Aug 20 19:15:00 2025 +0530"

echo "Step 1: Fixing commit date for commit 87569a2ca0b48fd747b8ddf7b119426a6406dce1"
git filter-branch -f --env-filter '
if [ "$GIT_COMMIT" = "87569a2ca0b48fd747b8ddf7b119426a6406dce1" ]; then
    export GIT_COMMITTER_DATE="'"$TARGET_DATE"'"
fi' -- 87569a2ca0b48fd747b8ddf7b119426a6406dce1^..87569a2ca0b48fd747b8ddf7b119426a6406dce1

echo "Step 2: Handling the commit 61937c24546744f18b48fc5cf545daac860390b6"

# First, check if temp branch exists and delete it if it does
if git show-ref --verify --quiet refs/heads/temp_fix; then
    git branch -D temp_fix
fi

# Create a new temporary branch from the parent of the commit we want to replace
git checkout -b temp_fix $(git rev-parse 61937c24546744f18b48fc5cf545daac860390b6^)

# Checkout the files we want to keep from the original commit, excluding shell scripts
echo "Checking out specific files from commit..."
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- CSP-IMPLEMENTATION.md
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- backend/src/app.js
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- frontend/security-middleware.js
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- frontend/vite.config.js
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- nginx-http-headers.conf
git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- nginx.conf

# Check if there are any Wapiti report files
if [ -d "reports/wapiti/wapiti-after" ]; then
    git checkout 61937c24546744f18b48fc5cf545daac860390b6 -- reports/wapiti/wapiti-after
fi

# Stage all the changes
git add --all

# Create the new commit with the desired message and date
echo "Creating new commit with updated message and date..."
GIT_AUTHOR_DATE="$TARGET_DATE" GIT_COMMITTER_DATE="$TARGET_DATE" \
git commit -m "Implement Content Security Policy (CSP) for enhanced web security"

# Save the new commit hash
NEW_COMMIT=$(git rev-parse HEAD)

# Move back to the dev branch and replace the old commit with the new one
echo "Updating dev branch to include the new commit..."
git checkout dev
git rebase --onto $NEW_COMMIT 61937c24546744f18b48fc5cf545daac860390b6^ 61937c24546744f18b48fc5cf545daac860390b6

# Clean up
git branch -D temp_fix

echo "All commit dates have been fixed and shell scripts have been removed."