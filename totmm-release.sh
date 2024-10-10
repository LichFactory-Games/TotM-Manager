#!/bin/bash

# Define variables
MODULE_JSON="module.json"
PATH_DIR="/Users/roambot/bin/foundry-modules/totmm-module/"
MODULE_DIR="$PATH_DIR/totm-manager"
RELEASE_DIR="../release"
MAIN_BRANCH="main"
REPO_URL="https://github.com/LichFactory-Games/TotM-Manager"
DOWNLOAD_BASE_URL="$REPO_URL/releases/download"
EXCLUDE_FILES=("screenshots" "totmm-release.sh" ".git" ".gitignore" "totmm-release.sh")
CURRENT_DIR=$(pwd)
DEV_DIR="/Volumes/airserver/fvtt-dir/Data/modules"

# Foundry API endpoint
FOUNDRY_API_ENDPOINT="https://api.foundryvtt.com/_api/packages/release_version/"

# Get the Foundry API token from the environment variable
FOUNDRY_API_TOKEN="$FOUNDRY_API_TOKEN"

# Check if the API token is set
if [ -z "$FOUNDRY_API_TOKEN" ]; then
  echo "Error: FOUNDRY_API_TOKEN is not set. Please set it as an environment variable."
  exit 1
fi

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

# Function to get the package ID from module.json
get_package_id() {
  jq -r '.id' "$MODULE_JSON"
}

# Check for development flag
DEVELOPMENT=false
if [ "$1" == "--dev" ]; then
  DEVELOPMENT=true
  echo "Development flag detected. Creating unzipped release directory without changing version, committing, or uploading."
fi

if [ "$DEVELOPMENT" = false ]; then
  # Check if on the main branch
  current_branch=$(git branch --show-current)
  if [ "$current_branch" != "$MAIN_BRANCH" ]; then
    echo "You are not on the $MAIN_BRANCH branch. Please switch to $MAIN_BRANCH and try again."
    exit 1
  fi

  # Pull the latest changes
  git pull origin "$MAIN_BRANCH"
fi

if [ "$DEVELOPMENT" = false ]; then
  # Get the current version
  current_version=$(get_version)
  echo "Current version: $current_version"

  # Ask for the new version
  read -p "Enter the new version: " new_version

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

  # Ask for additional release notes
  read -p "Enter additional release notes (or leave blank): " additional_notes
  if [ -z "$additional_notes" ]; then
    release_notes="Release $new_version"
  else
    release_notes="Release $new_version - $additional_notes"
  fi
fi

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

if [ "$DEVELOPMENT" = false ]; then
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
  echo "Creating GitHub release."
  gh release create "v$new_version" "../$RELEASE_ZIP" --title "TotM-Manager-v$new_version" --notes "$release_notes" "$MODULE_JSON"

  # Get the package ID
  PACKAGE_ID=$(get_package_id)

  # Construct the JSON payload for the API request
  API_JSON_PAYLOAD=$(jq -n \
    --arg id "$PACKAGE_ID" \
    --arg version "$new_version" \
    --arg manifest "$DOWNLOAD_BASE_URL/v$new_version/module.json" \
    --arg notes "$REPO_URL/releases/tag/v$new_version" \
    --arg minFoundryVersion "11" \
    --arg verifiedFoundryVersion "12.331" \
    '{
      id: $id,
      "dry-run": false,
      release: {
        version: $version,
        manifest: $manifest,
        notes: $notes,
        compatibility: {
          minimum: $minFoundryVersion,
          verified: $verifiedFoundryVersion
        }
      }
    }'
  )

  # Make the API call to the Foundry Package Release API
  echo "Making API call to Foundry Package Release API..."

  API_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FOUNDRY_API_ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: $FOUNDRY_API_TOKEN" \
    -d "$API_JSON_PAYLOAD")

  # Separate the response body and HTTP status code
  API_BODY=$(echo "$API_RESPONSE" | sed '$d')
  HTTP_STATUS=$(echo "$API_RESPONSE" | tail -n1)

  # Check if the API call was successful
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "Package release successful."
    echo "Response: $API_BODY"
  else
    echo "Package release failed with status code $HTTP_STATUS."
    echo "Response: $API_BODY"
    exit 1
  fi

else
  echo "Unzipped release directory created at $RELEASE_DIR/totm-manager for development purposes."

  # Check if the DEV_DIR exists
  if [ -d "$DEV_DIR" ]; then
    echo "Development directory exists. Moving unzipped release to $DEV_DIR."
    rsync -av --progress "$RELEASE_DIR/totm-manager/" "$DEV_DIR/totm-manager/"
    echo "Files moved to $DEV_DIR/totm-manager."
  else
    echo "Development directory $DEV_DIR does not exist."
  fi
fi
