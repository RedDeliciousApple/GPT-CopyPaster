(function() {
  // Skip if already initialized
  if (window.ChatGPTExportUI) return;
  
  // Create UI
  const panel = document.createElement('div');
  panel.id = 'chatgpt-export-ui';
  panel.style.position = 'fixed';
  panel.style.bottom = '20px';
  panel.style.right = '20px';
  panel.style.zIndex = '9999';
  panel.style.background = '#f0f4f9';
  panel.style.border = '1px solid #c9d7e8';
  panel.style.borderRadius = '8px';
  panel.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
  panel.style.fontFamily = 'Arial, sans-serif';
  panel.style.fontSize = '14px';
  panel.style.color = '#333';
  panel.style.width = '250px';
  
  // Create header with drag functionality
  panel.innerHTML = `
    <div style="background:#10a37f;color:white;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move;border-top-left-radius:8px;border-top-right-radius:8px;">
      <span style="font-weight:bold;">ChatGPT Export</span>
      <button id="close-export" style="background:none;border:none;color:white;font-size:16px;cursor:pointer;">✕</button>
    </div>
    <div style="padding:12px;display:flex;flex-direction:column;gap:8px;">
      <button id="select-all" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Select All</button>
      <button id="deselect-all" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Deselect All</button>
      <button id="copy-selected" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Copy Selected</button>
      <div id="status-message" style="margin-top:8px;font-size:12px;text-align:center;"></div>
    </div>
  `;
  
  document.body.appendChild(panel);
  window.ChatGPTExportUI = true;
  
  // Create a global array to track selected messages
  window.selectedMessages = [];
  
  // Make panel draggable
  const header = panel.querySelector('div');
  let isDragging = false;
  let offsetX, offsetY;
  
  header.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - panel.getBoundingClientRect().left;
    offsetY = e.clientY - panel.getBoundingClientRect().top;
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    panel.style.left = `${x}px`;
    panel.style.right = 'auto';
    panel.style.top = `${y}px`;
    panel.style.bottom = 'auto';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
  });
  
  // Show status message
  function showStatus(message, isError = false) {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.style.backgroundColor = isError ? '#fbecec' : '#e7f3ef';
    statusElement.style.color = isError ? '#e45858' : '#10a37f';
    statusElement.style.padding = '5px';
    statusElement.style.borderRadius = '4px';
    
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.style.backgroundColor = '';
      statusElement.style.color = '';
      statusElement.style.padding = '';
    }, 3000);
  }
  
  // Find all message containers (both user and assistant)
  function findMessages() {
    return Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]'))
      .filter(el => !el.closest('[data-testid="conversation-turn-counter"]')); // Filter out turn counters
  }
  
  // Toggle selection for a message
  function toggleMessageSelection(message, forceSelect = null) {
    // Determine if we should select or deselect
    const isSelected = forceSelect !== null ? forceSelect : 
                       !message.classList.contains('selected-message');
    
    // Update classes and visual indicators
    if (isSelected) {
      message.classList.add('selected-message');
      message.style.boxShadow = '0 0 0 2px #10a37f';
      
      // Add to selection array if not already there
      if (!window.selectedMessages.includes(message)) {
        window.selectedMessages.push(message);
      }
    } else {
      message.classList.remove('selected-message');
      message.style.boxShadow = '';
      
      // Remove from selection array
      window.selectedMessages = window.selectedMessages.filter(m => m !== message);
    }
    
    return isSelected;
  }
  
  // Set up message selection
  function setupMessages() {
    findMessages().forEach(message => {
      // Skip if already processed
      if (message.dataset.selectable === 'true') return;
      
      // Mark as processed
      message.dataset.selectable = 'true';
      
      // Initialize without selection
      toggleMessageSelection(message, false);
      
      // Add click handler for the entire message
      message.addEventListener('click', function(e) {
        // Don't interfere with links or buttons
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
            e.target.closest('a') || e.target.closest('button')) {
          return;
        }
        
        toggleMessageSelection(message);
      });
    });
  }
  
  // Initialize selection
  setupMessages();
  
  // Observe for new messages
  const observer = new MutationObserver(function() {
    setupMessages();
  });
  
  const chatContainer = document.querySelector('main') || document.body;
  observer.observe(chatContainer, {
    childList: true,
    subtree: true
  });
  
  // Extract and format HTML content from a message
  function getMessageHTML(message) {
    const role = message.getAttribute('data-message-author-role');
    const sender = role === 'user' ? 'You' : 'ChatGPT';
    
    // Find the content element
    const contentElement = message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');
    if (!contentElement) return `<p><strong>${sender}:</strong> [Content not found]</p>`;
    
    // Clone to avoid modifying the original
    const clone = contentElement.cloneNode(true);
    
    // Assemble the HTML
    return `<div><p><strong>${sender}:</strong></p>${clone.innerHTML}</div>`;
  }
  
  // Extract plain text content
  function getMessageText(message) {
    const role = message.getAttribute('data-message-author-role');
    const sender = role === 'user' ? 'You' : 'ChatGPT';
    
    // Find the content element
    const contentElement = message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');
    if (!contentElement) return `${sender}: [Content not found]`;
    
    // Get text content
    return `${sender}:\n${contentElement.textContent.trim()}\n\n`;
  }
  
  // Select All button
  document.getElementById('select-all').addEventListener('click', function() {
    const messages = findMessages();
    window.selectedMessages = [];
    
    messages.forEach(message => {
      toggleMessageSelection(message, true);
    });
    
    showStatus(`Selected ${messages.length} messages`);
  });
  
  // Deselect All button
  document.getElementById('deselect-all').addEventListener('click', function() {
    const messages = findMessages();
    
    messages.forEach(message => {
      toggleMessageSelection(message, false);
    });
    
    window.selectedMessages = [];
    showStatus('All messages deselected');
  });
  
  // Copy Selected button with rich text support
  document.getElementById('copy-selected').addEventListener('click', function() {
    if (window.selectedMessages.length === 0) {
      showStatus('No messages selected', true);
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
    
    // Copy to clipboard with formatted content
    try {
      // Use writeText as fallback for browsers that don't support ClipboardItem
      if (!navigator.clipboard.write || !ClipboardItem) {
        navigator.clipboard.writeText(plainText)
          .then(() => {
            showStatus(`Copied ${totalMessages} messages`);
          })
          .catch(err => {
            showStatus(`Error copying: ${err}`, true);
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
            // Just show total count regardless of formatting
            showStatus(`Copied ${totalMessages} messages`);
          })
          .catch(err => {
            showStatus(`Error copying: ${err}`, true);
            // Fallback to plain text
            navigator.clipboard.writeText(plainText)
              .then(() => {
                showStatus(`Copied ${totalMessages} messages`);
              });
          });
      }
    } catch (error) {
      // Final fallback for very old browsers
      showStatus('Advanced clipboard features not supported. Using plain text.', true);
      navigator.clipboard.writeText(plainText)
        .then(() => {
          showStatus(`Copied ${totalMessages} messages`);
        })
        .catch(err => {
          showStatus(`Error copying: ${err}`, true);
        });
    }
  });
  
  // Close button
  document.getElementById('close-export').addEventListener('click', function() {
    // Clean up selections
    window.selectedMessages.forEach(message => {
      message.classList.remove('selected-message');
      message.style.boxShadow = '';
    });
    
    // Remove panel
    panel.remove();
    
    // Stop observer
    observer.disconnect();
    
    // Reset state
    window.selectedMessages = [];
    window.ChatGPTExportUI = false;
  });
})();