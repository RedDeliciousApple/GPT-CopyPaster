(function() {
  // Flag to track if the copypaster is active
  if (window.ChatGPTCopyPasterActive) {
    // If it exists but is out of view, reset position
    const existingWidget = document.getElementById('chatgpt-export-widget');
    if (existingWidget) {
      const rect = existingWidget.getBoundingClientRect();
      // Check if widget is out of viewport
      if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) {
        existingWidget.style.right = '20px';
        existingWidget.style.bottom = '20px';
        existingWidget.style.left = 'auto';
        existingWidget.style.top = 'auto';
      }
    }
    return;
  }
  
  // Set flag to prevent multiple instances
  window.ChatGPTCopypasterActive = true;
  
  // Track event listeners for cleanup
  const eventListeners = [];
  
  // Create widget
  const widget = document.createElement('div');
  widget.id = 'chatgpt-export-widget';
  widget.style.position = 'fixed';
  widget.style.bottom = '20px';
  widget.style.right = '20px';
  widget.style.zIndex = '9999';
  widget.style.background = '#828282'; // Lighter gray
  widget.style.border = '1px solid #6e6e6e';
  widget.style.borderRadius = '8px';
  widget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  widget.style.fontFamily = 'Arial, sans-serif';
  widget.style.fontSize = '14px';
  widget.style.color = 'white';
  widget.style.cursor = 'pointer';
  widget.style.transition = 'all 0.2s ease';
  widget.style.display = 'flex';
  widget.style.alignItems = 'center';
  
  // Initial collapsed state
  widget.innerHTML = `
    <div id="widget-icon" style="padding: 8px 12px; font-size: 16px;">🧰</div>
    <div id="widget-close" style="padding: 8px; font-size: 16px; cursor: pointer;">❌</div>
    <div id="widget-controls" style="display: none; padding: 8px; white-space: nowrap;">
      <button id="select-all" style="background: none; border: none; color: white; cursor: pointer; margin-right: 8px;">Select All</button>
      <button id="deselect-all" style="background: none; border: none; color: white; cursor: pointer; margin-right: 8px;">Deselect</button>
      <button id="copy-selected" style="background: none; border: none; color: white; cursor: pointer; margin-right: 8px;">Copy</button>
    </div>
    <div id="toast-message" style="position: fixed; bottom: 60px; right: 20px; background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 4px; font-size: 14px; display: none; z-index: 10000;"></div>
  `;
  
  document.body.appendChild(widget);
  
  // Create a global array to track selected messages
  window.selectedMessages = [];
  
  // Track if widget is expanded
  let isExpanded = false;
  
  // Make widget draggable
  let isDragging = false;
  let offsetX, offsetY;
  
  function addEventListenerWithTracking(element, type, listener, options) {
    element.addEventListener(type, listener, options);
    eventListeners.push({ element, type, listener, options });
  }
  
  addEventListenerWithTracking(widget, 'mousedown', function(e) {
    // Don't initiate drag when clicking buttons
    if (e.target.tagName === 'BUTTON' || e.target.id === 'widget-close') return;
    
    isDragging = true;
    offsetX = e.clientX - widget.getBoundingClientRect().left;
    offsetY = e.clientY - widget.getBoundingClientRect().top;
  });
  
  addEventListenerWithTracking(document, 'mousemove', function(e) {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // Ensure widget stays within viewport
    const maxX = window.innerWidth - widget.offsetWidth;
    const maxY = window.innerHeight - widget.offsetHeight;
    
    const boundedX = Math.max(0, Math.min(x, maxX));
    const boundedY = Math.max(0, Math.min(y, maxY));
    
    widget.style.left = `${boundedX}px`;
    widget.style.right = 'auto';
    widget.style.top = `${boundedY}px`;
    widget.style.bottom = 'auto';
  });
  
  addEventListenerWithTracking(document, 'mouseup', function() {
    isDragging = false;
  });
  
  // Toggle expanded/collapsed state
  addEventListenerWithTracking(document.getElementById('widget-icon'), 'click', function(e) {
    if (isDragging) return;
    e.stopPropagation();
    
    const controls = document.getElementById('widget-controls');
    isExpanded = controls.style.display === 'none';
    
    controls.style.display = isExpanded ? 'block' : 'none';
    
    // Always setup message selection when exporter is active
    setupMessages();
  });
  
  // Close widget completely
  addEventListenerWithTracking(document.getElementById('widget-close'), 'click', function(e) {
    e.stopPropagation();
    cleanupExporter();
  });
  
  // Show toast message
  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast-message');
    toast.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
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
    // Allow selection as long as the exporter is active
    
    // Determine if we should select or deselect
    const isSelected = forceSelect !== null ? forceSelect : 
                      !message.classList.contains('selected-message');
    
    // Update classes and visual indicators
    if (isSelected) {
      message.classList.add('selected-message');
      message.style.boxShadow = '0 0 0 2px #10a37f'; // Keep the green highlight
      
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
    
    return isSelected;
  }
  
  const messageClickHandlers = new WeakMap();
  
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
      const clickHandler = function(e) {
        // Don't interfere with links or buttons
        if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON' || 
            e.target.closest('a') || e.target.closest('button')) {
          return;
        }
        
        toggleMessageSelection(message);
      };
      
      message.addEventListener('click', clickHandler);
      messageClickHandlers.set(message, clickHandler);
    });
  }
  
  // Observer for new messages
  const observer = new MutationObserver(function() {
    // Always setup new messages when exporter is active
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
    
    // Remove any existing selection markers
    const markers = clone.querySelectorAll('.message-selection-checkbox');
    markers.forEach(marker => marker.remove());
    
    // Assemble the HTML with added spacing between messages
    return `<div style="margin-bottom: 16px;"><p style="margin-bottom: 8px;"><strong>${sender}:</strong></p>${clone.innerHTML}</div>`;
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
  
  // Copy function to be used by both button and keyboard shortcut
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
      if (isLargeContent || !navigator.clipboard.write || !ClipboardItem) {
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
  
  // Function to clean up copypaster
  function cleanupCopyPaster() {
    // Remove all selection styles
    findMessages().forEach(message => {
      if (message.classList.contains('selected-message')) {
        message.classList.remove('selected-message');
        message.style.boxShadow = '';
      }
      
      // Remove checkbox indicators
      const checkboxIndicator = message.querySelector('.message-selection-checkbox');
      if (checkboxIndicator) {
        checkboxIndicator.remove();
      }
      
      // Remove click handlers
      const clickHandler = messageClickHandlers.get(message);
      if (clickHandler) {
        message.removeEventListener('click', clickHandler);
        messageClickHandlers.delete(message);
      }
      
      // Remove data attributes
      message.removeAttribute('data-selectable');
    });
    
    // Detach all registered event listeners
    eventListeners.forEach(({ element, type, listener, options }) => {
      element.removeEventListener(type, listener, options);
    });
    
    // Remove the keyboard shortcut listener
    document.removeEventListener('keydown', keydownHandler);
    
    // Remove widget from DOM
    widget.remove();
    
    // Disconnect observer
    observer.disconnect();
    
    // Reset state
    window.selectedMessages = [];
    window.ChatGPTCopyPasterActive = false;
  }
  
  // Select All button
  addEventListenerWithTracking(document.getElementById('select-all'), 'click', function(e) {
    e.stopPropagation(); // Prevent widget drag initialization
    
    const messages = findMessages();
    window.selectedMessages = [];
    
    messages.forEach(message => {
      toggleMessageSelection(message, true);
    });
    
    showToast(`Selected ${messages.length} messages`);
  });
  
  // Deselect All button
  addEventListenerWithTracking(document.getElementById('deselect-all'), 'click', function(e) {
    e.stopPropagation(); // Prevent widget drag initialization
    
    const messages = findMessages();
    
    messages.forEach(message => {
      toggleMessageSelection(message, false);
    });
    
    window.selectedMessages = [];
    showToast('All messages deselected');
  });
  
  // Copy Selected button
  addEventListenerWithTracking(document.getElementById('copy-selected'), 'click', function(e) {
    e.stopPropagation(); // Prevent widget drag initialization
    copySelectedMessages();
  });
  
  // Add keyboard shortcut (Ctrl+C or Cmd+C)
  const keydownHandler = function(e) {
    // Check if Ctrl+C or Cmd+C is pressed
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      // Only intercept if no text is manually selected
      if (window.getSelection().toString().length === 0 && window.selectedMessages.length > 0) {
        e.preventDefault(); // Prevent default copy behavior
        copySelectedMessages();
      }
    }
  };
  
  addEventListenerWithTracking(document, 'keydown', keydownHandler);
  
  // Initialize
  setupMessages(); // Set up messages right away
})();
