#!/bin/bash

# Define variables
MODULE_JSON="module.json"
PATH_DIR="/Users/roambot/bin/foundry-modules"
MODULE_DIR="$PATH_DIR/totm-manager"
RELEASE_DIR="../release"
MAIN_BRANCH="main"
REPO_URL="https://github.com/LichFactory-Games/TotM-Manager"
DOWNLOAD_BASE_URL="$REPO_URL/releases/download"
EXCLUDE_FILES=("screenshots" "totmm-release.sh" ".git" ".gitignore" "totmm-release.sh")
CURRENT_DIR=$(pwd)


# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq could not be found, please install it."
  exit 1
fi

# Check if gh is installed
if ! command -v gh &> /dev/null; then
  echo "gh (GitHub CLI) could not be found, please install it."
  exit 1
fi

# Function to get the current version from module.json
get_version() {
  jq -r '.version' "$MODULE_JSON"
}

# Function to set a new version in module.json
set_version() {
  local new_version=$1
  jq --arg version "$new_version" '.version = $version' "$MODULE_JSON" > temp.json && mv temp.json "$MODULE_JSON"
}

# Function to update the download URL in module.json
update_download_url() {
  local new_version=$1
  local new_download_url="$DOWNLOAD_BASE_URL/v$new_version/TotM-Manager-v$new_version.zip"
  jq --arg download "$new_download_url" '.download = $download' "$MODULE_JSON" > temp.json && mv temp.json "$MODULE_JSON"
}

# Check if on the main branch
current_branch=$(git branch --show-current)
if [ "$current_branch" != "$MAIN_BRANCH" ]; then
  echo "You are not on the $MAIN_BRANCH branch. Please switch to $MAIN_BRANCH and try again."
  exit 1
fi

# Pull the latest changes
git pull origin "$MAIN_BRANCH"

# Get the current version
current_version=$(get_version)
echo "Current version: $current_version"

# Ask for the new version
read -p "Enter the new version: " new_version

# Update the version in module.json
set_version "$new_version"
echo "Updated version in $MODULE_JSON to $new_version"

# Update the download URL in module.json
update_download_url "$new_version"
echo "Updated download URL in $MODULE_JSON to $DOWNLOAD_BASE_URL/v$new_version/TotM-Manager-v$new_version.zip"

# Commit the changes
git add "$MODULE_JSON"
git commit -m "Bump version to $new_version"

# Tag the new version
git tag "v$new_version"

# Push changes and tags
git push origin "$MAIN_BRANCH"
git push origin "v$new_version"

# Create a temporary directory for the release
mkdir -p "$RELEASE_DIR/totm-manager"

# Verify MODULE_DIR exists
if [ ! -d "$MODULE_DIR" ]; then
  echo "Error: The module directory $MODULE_DIR does not exist."
  exit 1
fi

# Copy the necessary files to the release directory
cp "$MODULE_JSON" "$PATH_DIR"
cp -r "$MODULE_DIR"/* "$RELEASE_DIR/totm-manager/"

# Remove excluded files and directories
for exclude in "${EXCLUDE_FILES[@]}"; do
  rm -rf "$RELEASE_DIR/totm-manager/$exclude"
done

# Create a ZIP file of the release named after the new version
RELEASE_ZIP="TotM-Manager-v$new_version.zip"
cd "$RELEASE_DIR"
zip -r "../$RELEASE_ZIP" .
echo "$new_version archive created successfully as $RELEASE_ZIP."

# Navigate back to the original directory
cd "$CURRENT_DIR"

# Clean up
echo "Cleaning up."
rm -rf "$RELEASE_DIR"

echo "Release $new_version created successfully as $RELEASE_ZIP."

# Create a GitHub release and upload assets
echo "Creating Github release."
gh release create "v$new_version" "../$RELEASE_ZIP" --title "TotM-Manager-v$new_version" --notes "Release $new_version" "$MODULE_JSON"
