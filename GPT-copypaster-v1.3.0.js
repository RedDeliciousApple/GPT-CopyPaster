// ==UserScript==
// @name         GPT-CopyPaster
// @namespace    https://chat.openai.com/
// @version      1.3.0
// @description  Enhanced message exporter for ChatGPT with context menu, improved selection mode, and text highlighting fixes
// @author       Original author + Claude optimizations
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // Initialize global state for the tool
    window.selectedMessages = [];
    window.exporter_eventListeners = [];
    window.ChatGPTCopyPasterActive = true;
    window.selectionModeActive = false; // Track if selection mode is active
    
    // Set up message selection through delegation
    setupMessageDelegation();
    
    // Create launcher button (appears only once)
    function createLauncher() {
        // Check if launcher already exists
        if (document.getElementById('chatgpt-exporter-launcher')) {
            return;
        }
        
        const launcher = document.createElement('div');
        launcher.id = 'chatgpt-exporter-launcher';
        launcher.style = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: rgba(16, 163, 127, 0.5); /* Start with semi-transparent */
            border-radius: 50%;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9998;
            transition: all 0.2s ease;
        `;
        launcher.innerHTML = `<div style="color: white; font-size: 24px;">📋</div>`;
        launcher.title = "Click to start selecting messages";
        document.body.appendChild(launcher);
        
        // Add click event to toggle selection mode
        launcher.addEventListener('click', function() {
            toggleSelectionMode();
        });
    }

    // Toggle selection mode on/off
    function toggleSelectionMode() {
        window.selectionModeActive = !window.selectionModeActive;
        
        const launcher = document.getElementById('chatgpt-exporter-launcher');
        
        if (window.selectionModeActive) {
            // Activate selection mode
            launcher.style.background = 'rgba(16, 163, 127, 1)'; // Solid green
            launcher.title = "Click to exit selection mode";
            showToast("Activated: click to select");
        } else {
            // Deactivate selection mode
            launcher.style.background = 'rgba(16, 163, 127, 0.5)'; // Semi-transparent
            launcher.title = "Click to activate selection mode";
            
            // Clear all selections when exiting selection mode
            clearAllSelections();
            showToast("Deactivated: selections cleared");
        }
    }
    
    // Clear all message selections
    function clearAllSelections() {
        const messages = findMessages();
        
        messages.forEach(message => {
            toggleMessageSelection(message, false);
        });
        
        window.selectedMessages = [];
    }
    
    // Create context menu on right-click
    function setupContextMenu() {
        // Function to add event listener with tracking for cleanup
        function addEventListenerWithTracking(element, type, listener, options) {
            element.addEventListener(type, listener, options);
            window.exporter_eventListeners.push({ element, type, listener, options });
        }
        
        
        // Context menu handler
        function handleContextMenu(e) {
            // Let browser menu show if text is selected
            if (window.getSelection().toString().trim().length > 0) return;
        
            // Only show if in selection mode OR some messages are selected
            if (!window.selectionModeActive && window.selectedMessages.length === 0) return;
        
            const message = e.target.closest('[data-message-author-role]');
            if (!message && window.selectedMessages.length === 0) return;
        
            e.preventDefault();
        
            // Remove existing menu
            const existing = document.getElementById('gpt-copypaster-context-menu');
            if (existing) existing.remove();
        
            // Create menu container
            const menu = document.createElement('div');
            menu.id = 'gpt-copypaster-context-menu';
            menu.style = `
                position: fixed;
                top: ${e.clientY}px;
                left: ${e.clientX}px;
                background: white;
                border: 1px solid #e5e5e5;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
            `;
        
            // Add menu HTML
            menu.innerHTML = `
                <div class="menu-item" id="ctx-select-all">Select All (GPT)</div>
                <div class="menu-item" id="ctx-copy-selected">Copy Selected (${window.selectedMessages.length})</div>
                <div class="menu-item has-submenu" id="ctx-save-as">
                    <span class="label">Save As</span>
                    <span class="arrow">▶</span>
                    <div class="submenu" id="save-submenu" style="display: none;">
                        <div class="menu-item" id="ctx-save-md">Markdown (.md)</div>
                        <div class="menu-item" id="ctx-save-txt">Plain Text (.txt)</div>
                        <div class="menu-item" id="ctx-save-html">HTML (.html)</div>
                    </div>
                </div>
            `;
        
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                #gpt-copypaster-context-menu,
                #gpt-copypaster-context-menu * {
                    user-select: none;
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                }
                #gpt-copypaster-context-menu .menu-item {
                    padding: 8px 16px;
                    cursor: pointer;
                    white-space: nowrap;
                    position: relative;
                    transition: background 0.2s ease;
                }
                #gpt-copypaster-context-menu .menu-item:hover {
                    background: #f0f0f0;
                }
                #gpt-copypaster-context-menu .submenu {
                    position: absolute;
                    left: 100%;
                    top: 0;
                    background: white;
                    border: 1px solid #e5e5e5;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    display: none;
                    z-index: 10001;
                }
                #gpt-copypaster-context-menu .has-submenu {
                    position: relative;
                }
            `;
            document.head.appendChild(style);
        
            // Add to DOM first!
            document.body.appendChild(menu);
        
            // Submenu toggle logic (NOW it will work)
            document.getElementById('ctx-save-as').addEventListener('click', function(e) {
                e.stopPropagation();
                const submenu = this.querySelector('.submenu');
                const arrow = this.querySelector('.arrow');
                const isOpen = submenu.style.display === 'block';
                submenu.style.display = isOpen ? 'none' : 'block';
                arrow.textContent = isOpen ? '▶' : '▼';
            });
        
            // Prevent submenu clicks from closing everything
            document.getElementById('save-submenu').addEventListener('click', e => e.stopPropagation());
        
            // Add core actions
            document.getElementById('ctx-select-all').addEventListener('click', () => {
                const gpts = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'))
                    .filter(el => !el.closest('[data-testid="conversation-turn-counter"]'));
                window.selectedMessages = [];
                gpts.forEach(msg => toggleMessageSelection(msg, true));
                showToast(`Selected ${gpts.length} GPT messages`);
                menu.remove();
            });
        
            document.getElementById('ctx-copy-selected').addEventListener('click', () => {
                copySelectedMessages();
                menu.remove();
            });
        
            document.getElementById('ctx-save-md').addEventListener('click', () => {
                exportSelectedMessages('markdown');
                menu.remove();
            });
        
            document.getElementById('ctx-save-txt').addEventListener('click', () => {
                exportSelectedMessages('text');
                menu.remove();
            });
        
            document.getElementById('ctx-save-html').addEventListener('click', () => {
                exportSelectedMessages('html');
                menu.remove();
            });
        
            // Close when clicking elsewhere
            setTimeout(() => {
                document.addEventListener('click', function close(e) {
                    if (!menu.contains(e.target)) {
                        menu.remove();
                        document.removeEventListener('click', close);
                    }
                });
            }, 10);
        }        
        
        // Add context menu event listener
        addEventListenerWithTracking(document, 'contextmenu', handleContextMenu);
        
        // Add keyboard shortcut (Ctrl+C or Cmd+C when messages are selected)
        window.keydownHandler = function(e) {
            // Check if Ctrl+C or Cmd+C is pressed
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                const selection = window.getSelection();
                if (selection && selection.toString().trim().length > 0) {
                    return; // Let the default copy happen
                }
                if (window.selectedMessages.length > 0) {
                    e.preventDefault();
                    copySelectedMessages();
                }
            }
            
        };
        
        addEventListenerWithTracking(document, 'keydown', window.keydownHandler);
    }

    
    
    // Show toast notification
    function showToast(message, duration = 3000) {
        let toast = document.getElementById('toast-message');
    
        // Create toast if it doesn't exist
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-message';
            toast.style.position = 'fixed';
            toast.style.bottom = '80px';
            toast.style.right = '20px';
            toast.style.background = 'rgba(50, 50, 50, 0.9)';
            toast.style.color = '#fff';
            toast.style.padding = '10px 16px';
            toast.style.borderRadius = '6px';
            toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
            toast.style.zIndex = '9999';
            toast.style.fontSize = '14px';
            toast.style.display = 'none';
            document.body.appendChild(toast);
        }
    
        toast.textContent = message;
        toast.style.display = 'block';
    
        if (window.toastTimeout) clearTimeout(window.toastTimeout);
        window.toastTimeout = setTimeout(() => {
            toast.style.display = 'none';
        }, duration);
    }
    
    // Find all message containers (both user and assistant)
    function findMessages() {
        return Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]'))
            .filter(el => !el.closest('[data-testid="conversation-turn-counter"]')); // Filter out turn counters
    }
    
    // Toggle selection for a message
    function toggleMessageSelection(message, forceSelect = null) {
        // If selection mode is not active and we're not forcing a selection, do nothing
        if (!window.selectionModeActive && forceSelect === null) {
            return false;
        }
        
        // Prevent interaction with elements that already have selection handlers
        if (message.dataset.handlingSelection === 'true') {
            return false;
        }
        
        // Mark as handling selection to prevent multiple triggers
        message.dataset.handlingSelection = 'true';
        
        // Determine if we should select or deselect
        const isSelected = forceSelect !== null ? forceSelect : 
                          !message.classList.contains('selected-message');
        
        // Update classes and visual indicators
        if (isSelected) {
            message.classList.add('selected-message');
            message.style.boxShadow = '0 0 0 2px #10a37f'; // Green highlight
            
            // Add the checkbox indicator
            let checkboxIndicator = message.querySelector('.message-selection-checkbox');
            if (!checkboxIndicator) {
                checkboxIndicator = document.createElement('div');
                checkboxIndicator.className = 'message-selection-checkbox';
                checkboxIndicator.style.position = 'absolute';
                checkboxIndicator.style.top = '10px';
                checkboxIndicator.style.right = '10px';
                checkboxIndicator.style.background = '#10a37f'; // Green checkbox
                checkboxIndicator.style.color = 'white';
                checkboxIndicator.style.width = '18px';
                checkboxIndicator.style.height = '18px';
                checkboxIndicator.style.borderRadius = '3px';
                checkboxIndicator.style.display = 'flex';
                checkboxIndicator.style.alignItems = 'center';
                checkboxIndicator.style.justifyContent = 'center';
                checkboxIndicator.style.fontSize = '12px';
                checkboxIndicator.style.zIndex = '1000';
                checkboxIndicator.innerHTML = '✓';
                
                // Make sure message has position relative for proper positioning
                const computedStyle = window.getComputedStyle(message);
                if (computedStyle.position === 'static') {
                    message.style.position = 'relative';
                }
                
                message.appendChild(checkboxIndicator);
            }
            
            // Add to selection array if not already there
            if (!window.selectedMessages.includes(message)) {
                window.selectedMessages.push(message);
            }
        } else {
            message.classList.remove('selected-message');
            message.style.boxShadow = '';
            
            // Remove the checkbox indicator
            const checkboxIndicator = message.querySelector('.message-selection-checkbox');
            if (checkboxIndicator) {
                checkboxIndicator.remove();
            }
            
            // Remove from selection array
            window.selectedMessages = window.selectedMessages.filter(m => m !== message);
        }
        
        // Reset handling flag
        setTimeout(() => {
            message.dataset.handlingSelection = 'false';
        }, 50);
        
        return isSelected;
    }
    
    // Handle text selection conflicts
    function setupTextSelectionHandler() {
        // Track if mouse is down for dragging selection
        let isMouseDown = false;
        
        document.addEventListener('mousedown', () => {
            isMouseDown = true;
        });
        
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
        
        // Use selectionchange event to detect when user selects text
        document.addEventListener('selectionchange', () => {
            if (!isMouseDown) return; // Only process during mouse drag
            
            const selection = window.getSelection();
            if (!selection || selection.isCollapsed) return; // No actual selection
            
            // If we have a text selection, find which message it's in
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const container = range.commonAncestorContainer;
                
                // Find the message containing this selection
                const message = container.nodeType === 1 
                    ? container.closest('[data-message-author-role]')
                    : container.parentElement.closest('[data-message-author-role]');
                
                // If selection is in a message and that message is currently selected, deselect it
                if (message && message.classList.contains('selected-message')) {
                    toggleMessageSelection(message, false);
                }
            }
        });
    }
    
    // Use event delegation for message selection
    function setupMessageDelegation() {
        // Remove existing handler if any
        if (window.messageClickHandler) {
            document.removeEventListener('click', window.messageClickHandler);
        }
        
        // Use a single delegated click handler
        window.messageClickHandler = function(e) {
            // If selection mode is not active, do nothing
            if (!window.selectionModeActive) return;
            
            // Don't interfere with links or buttons
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
                e.target.closest('a') || e.target.closest('button')) {
                return;
            }
            
            // Don't select if user is making a text selection
            if (window.getSelection().toString().length > 0) {
                return;
            }
            
            // Find the closest message element
            const message = e.target.closest('[data-message-author-role]');
            if (message && !message.closest('[data-testid="conversation-turn-counter"]')) {
                toggleMessageSelection(message);
            }
        };
        
        // Register the delegated handler
        document.addEventListener('click', window.messageClickHandler);
        window.exporter_eventListeners.push({ 
            element: document, 
            type: 'click', 
            listener: window.messageClickHandler 
        });
        
        // Immediately run mark messages to initialize selections
        markMessagesAsSelectable();
    }
    
    // Set up observer for new messages
    function setupMutationObserver() {
        // Use throttled observer for better performance
        let observerThrottleTimer = null;
        const observer = new MutationObserver(function() {
            // Don't process if not active
            if (!window.ChatGPTCopyPasterActive) {
                observer.disconnect();
                return;
            }
            
            // Throttle processing to reduce CPU usage
            if (observerThrottleTimer) return;
            
            observerThrottleTimer = setTimeout(() => {
                markMessagesAsSelectable();
                observerThrottleTimer = null;
            }, 300); // Process at most every 300ms
        });
        
        const chatContainer = document.querySelector('main') || document.body;
        observer.observe(chatContainer, {
            childList: true,
            subtree: true
        });
        
        // Store observer for cleanup
        window.copypasterObserver = observer;
    }
    
    // Mark messages as selectable
    function markMessagesAsSelectable() {
        // Mark all messages as selectable for visual indication
        findMessages().forEach(message => {
            // Skip if already processed
            if (message.dataset.selectable === 'true') return;
            
            // Mark as processed
            message.dataset.selectable = 'true';
            message.dataset.handlingSelection = 'false';
            
            // Initialize without selection
            toggleMessageSelection(message, false);
        });
    }
    
    // Extract and format HTML content from a message
    function getMessageHTML(message) {
        const role = message.getAttribute('data-message-author-role');
        const sender = role === 'user' ? 'You' : 'ChatGPT';
        
        // Find the content element
        const contentElement = message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');
        if (!contentElement) return `<p><strong>${sender}:</strong> [Content not found]</p>`;
        
        // Clone to avoid modifying the original
        const clone = contentElement.cloneNode(true);
        
        // Remove any existing selection markers
        const markers = clone.querySelectorAll('.message-selection-checkbox');
        markers.forEach(marker => marker.remove());
        
        // Assemble the HTML with added spacing between messages
        return `<div style="margin-bottom: 16px;"><p style="margin-bottom: 8px;"><strong>${sender}:</strong></p>${clone.innerHTML}</div>`;
    }
    
    // Extract markdown content from a message
    function getMessageMarkdown(message) {
        const role = message.getAttribute('data-message-author-role');
        const sender = role === 'user' ? 'You' : 'ChatGPT';
        
        // Find the content element
        const contentElement = message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');
        if (!contentElement) return `**${sender}:** [Content not found]\n\n`;
        
        // Extract text content
        const text = contentElement.textContent.trim();
        
        // Format code blocks
        const formattedText = text.replace(/^```(.+)$/gm, '```$1'); // Preserve language specifiers
        
        // Convert to markdown format
        return `**${sender}:**\n\n${formattedText}\n\n---\n\n`;
    }
    
    // Extract plain text content from a message
    function getMessageText(message) {
        const role = message.getAttribute('data-message-author-role');
        const sender = role === 'user' ? 'You' : 'ChatGPT';
        
        // Find the content element
        const contentElement = message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');
        if (!contentElement) return `${sender}: [Content not found]\n\n`;
        
        // Get text content
        return `${sender}:\n${contentElement.textContent.trim()}\n\n`;
    }
    
    // Copy selected messages to clipboard
    function copySelectedMessages() {
        if (window.selectedMessages.length === 0) {
            showToast('No messages selected');
            return;
        }
        
        // Sort by document position
        const sortedMessages = [...window.selectedMessages].sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        
        // Extract HTML and text content
        let htmlContent = '';
        let plainText = '';
        
        sortedMessages.forEach(message => {
            htmlContent += getMessageHTML(message);
            plainText += getMessageText(message);
        });
        
        // Wrap HTML in proper document structure
        htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlContent}</body></html>`;
        
        // Get total message count (user + assistant)
        const totalMessages = sortedMessages.length;
        
        // Check for large content
        const isLargeContent = htmlContent.length > 1000000 || plainText.length > 100000;
        
        // Copy to clipboard with formatted content
        try {
            // Use writeText for large content or as fallback
            if (isLargeContent || !navigator.clipboard.write || !window.ClipboardItem) {
                navigator.clipboard.writeText(plainText)
                    .then(() => {
                        showToast(`Copied ${totalMessages} messages (plain text)`);
                    })
                    .catch(err => {
                        showToast(`Error copying: ${err}`);
                    });
            } else {
                const clipboardItems = [
                    new ClipboardItem({
                        'text/html': new Blob([htmlContent], {type: 'text/html'}),
                        'text/plain': new Blob([plainText], {type: 'text/plain'})
                    })
                ];
                
                navigator.clipboard.write(clipboardItems)
                    .then(() => {
                        showToast(`Copied ${totalMessages} messages`);
                    })
                    .catch(err => {
                        showToast(`Error copying: ${err}`);
                        // Fallback to plain text
                        navigator.clipboard.writeText(plainText)
                            .then(() => {
                                showToast(`Copied ${totalMessages} messages (plain text)`);
                            });
                    });
            }
        } catch (error) {
            // Final fallback for very old browsers
            showToast('Using plain text mode');
            navigator.clipboard.writeText(plainText)
                .then(() => {
                    showToast(`Copied ${totalMessages} messages (plain text)`);
                })
                .catch(err => {
                    showToast(`Error copying: ${err}`);
                });
        }
    }
    
    // Export selected messages as a file
    function exportSelectedMessages(format) {
        if (window.selectedMessages.length === 0) {
            showToast('No messages selected');
            return;
        }
        
        // Sort by document position (top to bottom)
        const sortedMessages = [...window.selectedMessages].sort((a, b) => {
            const position = a.compareDocumentPosition(b);
            return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
        });
        
        // Get chat title (if available)
        const chatTitle = document.title
            .replace('ChatGPT', '')
            .replace(' - ', '')
            .trim() || 'ChatGPT-Conversation';
            
        // Get current date/time for filename
        const now = new Date();
        const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
        const timeStr = now.toLocaleTimeString().replace(/[:.]/g, '-');
        
        let content = '';
        let filename = `${chatTitle}-${dateStr}`;
        let mimeType = '';
        
        // Create content based on format
        if (format === 'html') {
            // HTML format
            let htmlBody = '';
            
            // Add metadata header
            htmlBody += `<h1>${chatTitle}</h1>`;
            htmlBody += `<p><em>Exported on ${now.toLocaleString()}</em></p>`;
            htmlBody += `<hr>`;
            
            // Add messages
            sortedMessages.forEach(message => {
                htmlBody += getMessageHTML(message);
            });
            
            // Create full HTML document
            content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${chatTitle}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif; line-height: 1.6; padding: 1em; max-width: 50em; margin: 0 auto; color: #333; }
        pre { background: #f5f5f5; padding: 1em; border-radius: 4px; overflow-x: auto; }
        code { font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 0.9em; }
        h1 { color: #10a37f; }
        strong { color: #10a37f; }
    </style>
</head>
<body>
${htmlBody}
</body>
</html>`;
            
            filename += '.html';
            mimeType = 'text/html';
            
        } else if (format === 'markdown') {
            // Markdown format
            
            // Add metadata header
            content += `# ${chatTitle}\n\n`;
            content += `*Exported on ${now.toLocaleString()}*\n\n`;
            content += `---\n\n`;
            
            // Add messages
            sortedMessages.forEach(message => {
                content += getMessageMarkdown(message);
            });
            
            filename += '.md';
            mimeType = 'text/markdown';
            
        } else {
            // Plain text format
            
            // Add metadata header
            content += `${chatTitle}\n`;
            content += `Exported on ${now.toLocaleString()}\n\n`;
            content += `----------------------------------------\n\n`;
            
            // Add messages
            sortedMessages.forEach(message => {
                content += getMessageText(message);
            });
            
            filename += '.txt';
            mimeType = 'text/plain';
        }
        
        // Create download link
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        showToast(`Exported ${sortedMessages.length} messages as ${format.toUpperCase()}`);
    }
    
    // Exit function - completely remove the tool
    function exitCopyPaster() {
        // Run cleanup
        cleanupCopyPaster();
        
        // Also remove the launcher
        const launcher = document.getElementById('chatgpt-exporter-launcher');
        if (launcher) launcher.remove();
        
        // Set flag to prevent reinitializing
        window.GPTCopyPasterRemoved = true;
    }
    
    // Function to clean up copypaster
    window.cleanupCopyPaster = function() {
        // Disconnect observer
        if (window.copypasterObserver) {
            window.copypasterObserver.disconnect();
            window.copypasterObserver = null;
        }
        
        // Remove all selection styles
        document.querySelectorAll('.selected-message').forEach(message => {
            message.classList.remove('selected-message');
            message.style.boxShadow = '';
        });
        
        // Remove checkbox indicators
        document.querySelectorAll('.message-selection-checkbox').forEach(checkbox => {
            checkbox.remove();
        });
        
        // Remove selectable data attributes
        document.querySelectorAll('[data-selectable="true"]').forEach(message => {
            message.removeAttribute('data-selectable');
            message.removeAttribute('data-handling-selection');
        });
        
        // Detach all registered event listeners
        if (window.exporter_eventListeners) {
            window.exporter_eventListeners.forEach(({ element, type, listener, options }) => {
                element.removeEventListener(type, listener, options);
            });
            window.exporter_eventListeners = [];
        }
        
        // Remove message click handler
        if (window.messageClickHandler) {
            document.removeEventListener('click', window.messageClickHandler);
            window.messageClickHandler = null;
        }
        
        // Remove the keyboard shortcut listener
        if (window.keydownHandler) {
            document.removeEventListener('keydown', window.keydownHandler);
            window.keydownHandler = null;
        }
        
        // Remove any toasts
        const toast = document.getElementById('toast-message');
        if (toast) toast.remove();
        
        // Remove any open context menu and submenu
        const contextMenu = document.getElementById('gpt-copypaster-context-menu');
        if (contextMenu) contextMenu.remove();
        
        const submenu = document.getElementById('gpt-copypaster-submenu');
        if (submenu) submenu.remove();
        
        // Reset state
        window.selectedMessages = [];
        window.selectionModeActive = false;
        window.ChatGPTCopyPasterActive = false;
    };
    
    // Global utility to reset and cleanup manually if needed
    window.resetCopyPaster = window.cleanupCopyPaster;
    
    // Set up text selection handler to detect highlighting
    setupTextSelectionHandler();
    
    // Set up context menu
    setupContextMenu();
    
    // Initialize immediately with observer to process new messages
    setupMutationObserver();
    
    // Create launcher when page is loaded
    function initOnLoad() {
        // Only initialize if not manually removed during this session
        if (window.GPTCopyPasterRemoved) {
            return;
        }
        
        // Wait for the main interface to load
        const interval = setInterval(() => {
            if (document.querySelector('main')) {
                clearInterval(interval);
                createLauncher();
            }
        }, 500);
    }
    
    // Initialize when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOnLoad);
    } else {
        initOnLoad();
    }
})();