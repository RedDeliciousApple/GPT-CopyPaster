# GPT-CopyPaster

A lightweight, efficient tool for selecting, copying, and exporting messages from ChatGPT conversations. This userscript enhances the ChatGPT interface with a non-intrusive utility that lets you save important responses for later use.

## Features

- **Message Selection**: Click on any message to select/deselect it
- **Batch Operations**: Select multiple messages at once
- **Copy Formatting**: Preserves formatting, code blocks, and structure when copying
- **Multiple Export Formats**: Save as Markdown, HTML, or plain text
- **Keyboard Shortcuts**: Use Ctrl+C/Cmd+C to copy selected messages
- **Unobtrusive Design**: Clean UI that integrates with ChatGPT's aesthetic

## What's New in v1.2.3

This maintenance update fixes two important user experience issues:

1. **Toast Notification Fix**: Notification messages now appear consistently when copying content via keyboard shortcuts, even if the control panel isn't open
2. **Selection Behavior Fix**: Message selection now works immediately on page load without requiring the panel to be opened first

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) 
   - [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) (iOS)

2. Install GPT-CopyPaster:
   - Click the Tampermonkey icon in your browser
   - Select "Create a new script"
   - Copy and paste the entire script content from GPT-CopyPaster-v1.2.3.js
   - Save the script (Ctrl+S or Cmd+S)

## Usage

1. **Launch**: Click the 📋 button that appears in the bottom-right corner of the ChatGPT interface
2. **Select Messages**: Click on any ChatGPT or user message to select it (a green checkmark will appear)
3. **Quick Actions**:
   - Click "Select All (GPT)" to select all assistant responses
   - Click "Deselect All" to clear your selection
   - Click "Copy" to copy selected messages to clipboard
   - Click "Save ▼" to export as Markdown, Text, or HTML


## Keyboard Shortcuts

- **Ctrl+C/Cmd+C**: Copy selected messages (when no text is manually selected)

## Uninstall

To completely remove the tool from a page:
1. Click the "Exit" button at the bottom of the panel
2. To reinstall, refresh the page

For permanent removal, disable or remove the script from your userscript manager.
