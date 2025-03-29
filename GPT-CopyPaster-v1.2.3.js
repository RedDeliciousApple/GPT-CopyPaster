// ==UserScript==
// @name         GPT-CopyPaster
// @namespace    https://chat.openai.com/
// @version      1.2.3
// @description  Enhanced message exporter for ChatGPT with selection, copying, and export features
// @author       Original author + Claude optimizations
// @match        https://chat.openai.com/*
// @match        https://chatgpt.com/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    
    // Initialize global state for the tool immediately to fix selection bug
    window.selectedMessages = [];
    window.exporter_eventListeners = [];
    window.ChatGPTCopyPasterActive = true;
    
    // Set up message selection through delegation immediately
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
            background: #10a37f;
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
        document.body.appendChild(launcher);
        
        // Add click event to toggle the panel
        launcher.addEventListener('click', function() {
            const panel = document.getElementById('chatgpt-export-panel');
            
            if (panel) {
                // Toggle panel visibility if it already exists
                if (panel.style.display === 'none') {
                    panel.style.display = 'flex';
                } else {
                    panel.style.display = 'none';
                }
            } else {
                // Create the panel if it doesn't exist
                createExportPanel();
            }
        });
    }

    // Create the main export panel
    function createExportPanel() {
        // Clean up any existing panel
        const existingPanel = document.getElementById('chatgpt-export-panel');
        if (existingPanel) {
            existingPanel.remove();
        }
        
        // Create main panel
        const panel = document.createElement('div');
        panel.id = 'chatgpt-export-panel';
        panel.style = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            width: 160px;
            background: #f7f7f8;
            border: 1px solid #e5e5e5;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
            font-size: 14px;
            color: #333;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Panel header with title
        panel.innerHTML = `
            <div style="background: #10a37f; color: white; padding: 10px 12px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
                <span>GPT-CopyPaster</span>
            </div>
            <div style="display: flex; flex-direction: column; padding: 8px;">
                <button id="select-all-btn" class="exporter-btn">Select All (GPT)</button>
                <button id="deselect-btn" class="exporter-btn">Deselect All</button>
                <button id="copy-btn" class="exporter-btn">Copy</button>
                <div style="height: 1px; background: #e5e5e5; margin: 8px 0;"></div>
                <button id="save-btn" class="exporter-btn">Save ▼</button>
                <div id="save-dropdown" style="display: none; flex-direction: column; margin-top: 4px;">
                    <button id="save-md-btn" class="exporter-btn dropdown-btn">Markdown (.md)</button>
                    <button id="save-txt-btn" class="exporter-btn dropdown-btn">Plain Text (.txt)</button>
                    <button id="save-html-btn" class="exporter-btn dropdown-btn">HTML (.html)</button>
                </div>
                <div style="height: 1px; background: #e5e5e5; margin: 8px 0;"></div>
                <button id="exit-btn" class="exporter-btn exit-btn">Exit</button>
            </div>
        `;
        
        document.body.appendChild(panel);
        
        // Add styles for buttons
        const style = document.createElement('style');
        style.textContent = `
            .exporter-btn {
                background: none;
                border: 1px solid #10a37f;
                color: #10a37f;
                border-radius: 4px;
                padding: 8px 12px;
                margin-bottom: 8px;
                cursor: pointer;
                font-size: 14px;
                text-align: left;
                transition: all 0.2s ease;
            }
            .exporter-btn:hover {
                background: rgba(16, 163, 127, 0.1);
            }
            .dropdown-btn {
                margin-left: 8px;
                font-size: 13px;
                padding: 6px 8px;
            }
            .exit-btn {
                color: #e53e3e;
                border-color: #e53e3e;
            }
            .exit-btn:hover {
                background: rgba(229, 62, 62, 0.1);
            }
            .selected-message {
                position: relative;
            }
            .gpt-copypaster-toast {
                position: fixed;
                bottom: 60px;
                right: 20px;
                background: rgba(0,0,0,0.7);
                color: white;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                z-index: 10000;
                opacity: 1;
                transition: opacity 0.3s ease;
            }
        `;
        document.head.appendChild(style);
        
        // Use throttled observer for DOM changes
        setupMutationObserver();
        
        // Set up event listeners for all buttons
        setupEventListeners();
    }
    
    // Set up all button event listeners
    function setupEventListeners() {
        // Function to add event listener with tracking for cleanup
        function addEventListenerWithTracking(element, type, listener, options) {
            element.addEventListener(type, listener, options);
            window.exporter_eventListeners.push({ element, type, listener, options });
        }
        
        // Exit button - completely remove the tool
        addEventListenerWithTracking(document.getElementById('exit-btn'), 'click', function() {
            exitCopyPaster();
        });
        
        // Select All (GPT) button - only selects assistant messages
        addEventListenerWithTracking(document.getElementById('select-all-btn'), 'click', function() {
            // Only select assistant messages
            const gptMessages = Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'))
                .filter(el => !el.closest('[data-testid="conversation-turn-counter"]'));
            
            window.selectedMessages = [];
            
            gptMessages.forEach(message => {
                toggleMessageSelection(message, true);
            });
            
            showToast(`Selected ${gptMessages.length} GPT messages`);
        });
        
        // Deselect All button
        addEventListenerWithTracking(document.getElementById('deselect-btn'), 'click', function() {
            const messages = findMessages();
            
            messages.forEach(message => {
                toggleMessageSelection(message, false);
            });
            
            window.selectedMessages = [];
            showToast('All messages deselected');
        });
        
        // Copy Selected button
        addEventListenerWithTracking(document.getElementById('copy-btn'), 'click', function() {
            copySelectedMessages();
        });
        
        // Save dropdown toggle
        addEventListenerWithTracking(document.getElementById('save-btn'), 'click', function() {
            const dropdown = document.getElementById('save-dropdown');
            dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
        });
        
        // Save as Markdown button
        addEventListenerWithTracking(document.getElementById('save-md-btn'), 'click', function() {
            exportSelectedMessages('markdown');
            document.getElementById('save-dropdown').style.display = 'none';
        });
        
        // Save as Text button
        addEventListenerWithTracking(document.getElementById('save-txt-btn'), 'click', function() {
            exportSelectedMessages('text');
            document.getElementById('save-dropdown').style.display = 'none';
        });
        
        // Save as HTML button
        addEventListenerWithTracking(document.getElementById('save-html-btn'), 'click', function() {
            exportSelectedMessages('html');
            document.getElementById('save-dropdown').style.display = 'none';
        });
        
        // Add keyboard shortcut (Ctrl+C or Cmd+C when messages are selected)
        window.keydownHandler = function(e) {
            // Check if Ctrl+C or Cmd+C is pressed
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                // Only intercept if no text is manually selected
                if (window.getSelection().toString().length === 0 && window.selectedMessages.length > 0) {
                    e.preventDefault(); // Prevent default copy behavior
                    copySelectedMessages();
                }
            }
        };
        
        addEventListenerWithTracking(document, 'keydown', window.keydownHandler);
        
        // Close dropdown when clicking outside
        addEventListenerWithTracking(document, 'click', function(e) {
            const dropdown = document.getElementById('save-dropdown');
            const saveBtn = document.getElementById('save-btn');
            
            if (dropdown && dropdown.style.display !== 'none' && !dropdown.contains(e.target) && e.target !== saveBtn) {
                dropdown.style.display = 'none';
            }
        });
    }
    
    // Fixed show toast function that works even if panel isn't initialized
    function showToast(message, duration = 3000) {
        let toast = document.getElementById('toast-message');
    
        // ✅ Create it if it doesn't exist yet
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'toast-message';
            toast.style.position = 'fixed';
            toast.style.bottom = '20px';
            toast.style.left = '20px';
            toast.style.background = '#4CAF50';
            toast.style.color = '#fff';
            toast.style.padding = '10px 16px';
            toast.style.borderRadius = '6px';
            toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
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
        // Prevent interaction with elements that already have selection handlers
        if (message.dataset.handlingSelection === 'true') {
            return;
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
    
    // Use event delegation for message selection
    function setupMessageDelegation() {
        // Remove existing handler if any
        if (window.messageClickHandler) {
            document.removeEventListener('click', window.messageClickHandler);
        }
        
        // Use a single delegated click handler
        window.messageClickHandler = function(e) {
            // Don't interfere with links or buttons
            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
                e.target.closest('a') || e.target.closest('button') ||
                e.target.closest('#chatgpt-export-panel')) {
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
        // Remove panel from DOM
        const panel = document.getElementById('chatgpt-export-panel');
        if (panel) panel.remove();
        
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
        const toast = document.querySelector('.gpt-copypaster-toast');
        if (toast) toast.remove();
        
        // Reset state
        window.selectedMessages = [];
        window.ChatGPTCopyPasterActive = false;
    };
    
    // Global utility to reset and cleanup manually if needed
    window.resetCopyPaster = window.cleanupCopyPaster;
    
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
