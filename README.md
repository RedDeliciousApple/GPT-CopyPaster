# ChatGPT CopyPaster Bookmarklet

A lightweight bookmarklet that allows you to select and copypaste ChatGPT messages with rich text formatting preserved.

## Features

- **Message Selection**: Click on any message to select it (highlighted with a green border)
- **Batch Operations**: Select all or deselect all messages with one click
- **Rich Text CopyPaste**: Preserves formatting when pasting into Google Docs, Word, etc.
- **Attribution**: Clearly labels messages with "You:" and "ChatGPT:"
- **Formatting Support**: Preserves code blocks, tables, lists, bold/italic text, and more
- **Simple Interface**: Lightweight floating widget that can be dragged anywhere on screen
- **No Installation Required**: Works directly as a bookmark in your browser

## Installation

1. Create a new bookmark in your browser
2. Name it "ChatGPT CopyPaster" (or any name you prefer)
3. Copy and paste the following code into the URL/location field:

```javascript
javascript:(function(){if(window.ChatGPTCopyPasterActive){const existingWidget=document.getElementById('chatgpt-export-widget');if(existingWidget){const rect=existingWidget.getBoundingClientRect();if(rect.right<0||rect.bottom<0||rect.left>window.innerWidth||rect.top>window.innerHeight){existingWidget.style.right='20px';existingWidget.style.bottom='20px';existingWidget.style.left='auto';existingWidget.style.top='auto';}}return;}window.ChatGPTCopypasterActive=true;const eventListeners=[];const widget=document.createElement('div');widget.id='chatgpt-export-widget';widget.style.position='fixed';widget.style.bottom='20px';widget.style.right='20px';widget.style.zIndex='9999';widget.style.background='#828282';widget.style.border='1px solid #6e6e6e';widget.style.borderRadius='8px';widget.style.boxShadow='0 2px 10px rgba(0,0,0,0.2)';widget.style.fontFamily='Arial, sans-serif';widget.style.fontSize='14px';widget.style.color='white';widget.style.cursor='pointer';widget.style.transition='all 0.2s ease';widget.style.display='flex';widget.style.alignItems='center';widget.innerHTML=`<div id="widget-icon" style="padding:8px 12px;font-size:16px;">🧰</div><div id="widget-close" style="padding:8px;font-size:16px;cursor:pointer;">❌</div><div id="widget-controls" style="display:none;padding:8px;white-space:nowrap;"><button id="select-all" style="background:none;border:none;color:white;cursor:pointer;margin-right:8px;">Select All</button><button id="deselect-all" style="background:none;border:none;color:white;cursor:pointer;margin-right:8px;">Deselect</button><button id="copy-selected" style="background:none;border:none;color:white;cursor:pointer;margin-right:8px;">Copy</button></div><div id="toast-message" style="position:fixed;bottom:60px;right:20px;background:rgba(0,0,0,0.7);color:white;padding:8px 16px;border-radius:4px;font-size:14px;display:none;z-index:10000;"></div>`;document.body.appendChild(widget);window.selectedMessages=[];let isExpanded=false;let isDragging=false;let offsetX,offsetY;function addEventListenerWithTracking(element,type,listener,options){element.addEventListener(type,listener,options);eventListeners.push({element,type,listener,options});}addEventListenerWithTracking(widget,'mousedown',function(e){if(e.target.tagName==='BUTTON'||e.target.id==='widget-close')return;isDragging=true;offsetX=e.clientX-widget.getBoundingClientRect().left;offsetY=e.clientY-widget.getBoundingClientRect().top;});addEventListenerWithTracking(document,'mousemove',function(e){if(!isDragging)return;const x=e.clientX-offsetX;const y=e.clientY-offsetY;const maxX=window.innerWidth-widget.offsetWidth;const maxY=window.innerHeight-widget.offsetHeight;const boundedX=Math.max(0,Math.min(x,maxX));const boundedY=Math.max(0,Math.min(y,maxY));widget.style.left=`${boundedX}px`;widget.style.right='auto';widget.style.top=`${boundedY}px`;widget.style.bottom='auto';});addEventListenerWithTracking(document,'mouseup',function(){isDragging=false;});addEventListenerWithTracking(document.getElementById('widget-icon'),'click',function(e){if(isDragging)return;e.stopPropagation();const controls=document.getElementById('widget-controls');isExpanded=controls.style.display==='none';controls.style.display=isExpanded?'block':'none';setupMessages();});addEventListenerWithTracking(document.getElementById('widget-close'),'click',function(e){e.stopPropagation();cleanupCopyPaster();});function showToast(message,duration=3000){const toast=document.getElementById('toast-message');toast.textContent=message;toast.style.display='block';setTimeout(()=>{toast.style.display='none';},duration);}function findMessages(){return Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]')).filter(el=>!el.closest('[data-testid="conversation-turn-counter"]'));}function toggleMessageSelection(message,forceSelect=null){const isSelected=forceSelect!==null?forceSelect:!message.classList.contains('selected-message');if(isSelected){message.classList.add('selected-message');message.style.boxShadow='0 0 0 2px #10a37f';let checkboxIndicator=message.querySelector('.message-selection-checkbox');if(!checkboxIndicator){checkboxIndicator=document.createElement('div');checkboxIndicator.className='message-selection-checkbox';checkboxIndicator.style.position='absolute';checkboxIndicator.style.top='10px';checkboxIndicator.style.right='10px';checkboxIndicator.style.background='#10a37f';checkboxIndicator.style.color='white';checkboxIndicator.style.width='18px';checkboxIndicator.style.height='18px';checkboxIndicator.style.borderRadius='3px';checkboxIndicator.style.display='flex';checkboxIndicator.style.alignItems='center';checkboxIndicator.style.justifyContent='center';checkboxIndicator.style.fontSize='12px';checkboxIndicator.style.zIndex='1000';checkboxIndicator.innerHTML='✓';const computedStyle=window.getComputedStyle(message);if(computedStyle.position==='static'){message.style.position='relative';}message.appendChild(checkboxIndicator);}if(!window.selectedMessages.includes(message)){window.selectedMessages.push(message);}}else{message.classList.remove('selected-message');message.style.boxShadow='';const checkboxIndicator=message.querySelector('.message-selection-checkbox');if(checkboxIndicator){checkboxIndicator.remove();}window.selectedMessages=window.selectedMessages.filter(m=>m!==message);}return isSelected;}const messageClickHandlers=new WeakMap();function setupMessages(){findMessages().forEach(message=>{if(message.dataset.selectable==='true')return;message.dataset.selectable='true';toggleMessageSelection(message,false);const clickHandler=function(e){if(e.target.tagName==='A'||e.target.tagName==='BUTTON'||e.target.closest('a')||e.target.closest('button')){return;}toggleMessageSelection(message);};message.addEventListener('click',clickHandler);messageClickHandlers.set(message,clickHandler);});}const observer=new MutationObserver(function(){setupMessages();});const chatContainer=document.querySelector('main')||document.body;observer.observe(chatContainer,{childList:true,subtree:true});function getMessageHTML(message){const role=message.getAttribute('data-message-author-role');const sender=role==='user'?'You':'ChatGPT';const contentElement=message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');if(!contentElement)return `<p><strong>${sender}:</strong> [Content not found]</p>`;const clone=contentElement.cloneNode(true);const markers=clone.querySelectorAll('.message-selection-checkbox');markers.forEach(marker=>marker.remove());return `<div style="margin-bottom:16px;"><p style="margin-bottom:8px;"><strong>${sender}:</strong></p>${clone.innerHTML}</div>`;}function getMessageText(message){const role=message.getAttribute('data-message-author-role');const sender=role==='user'?'You':'ChatGPT';const contentElement=message.querySelector('.markdown-content, .markdown, .whitespace-pre-wrap');if(!contentElement)return `${sender}: [Content not found]`;return `${sender}:\n${contentElement.textContent.trim()}\n\n`;}function copySelectedMessages(){if(window.selectedMessages.length===0){showToast('No messages selected');return;}const sortedMessages=[...window.selectedMessages].sort((a,b)=>{const position=a.compareDocumentPosition(b);return position&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;});let htmlContent='';let plainText='';sortedMessages.forEach(message=>{htmlContent+=getMessageHTML(message);plainText+=getMessageText(message);});htmlContent=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${htmlContent}</body></html>`;const totalMessages=sortedMessages.length;const isLargeContent=htmlContent.length>1000000||plainText.length>100000;try{if(isLargeContent||!navigator.clipboard.write||!ClipboardItem){navigator.clipboard.writeText(plainText).then(()=>{showToast(`Copied ${totalMessages} messages (plain text)`);}).catch(err=>{showToast(`Error copying: ${err}`);});}else{const clipboardItems=[new ClipboardItem({'text/html':new Blob([htmlContent],{type:'text/html'}),'text/plain':new Blob([plainText],{type:'text/plain'})})];navigator.clipboard.write(clipboardItems).then(()=>{showToast(`Copied ${totalMessages} messages`);}).catch(err=>{showToast(`Error copying: ${err}`);navigator.clipboard.writeText(plainText).then(()=>{showToast(`Copied ${totalMessages} messages (plain text)`);});});}}catch(error){showToast('Using plain text mode');navigator.clipboard.writeText(plainText).then(()=>{showToast(`Copied ${totalMessages} messages (plain text)`);}).catch(err=>{showToast(`Error copying: ${err}`);});}}function cleanupCopyPaster(){findMessages().forEach(message=>{if(message.classList.contains('selected-message')){message.classList.remove('selected-message');message.style.boxShadow='';}const checkboxIndicator=message.querySelector('.message-selection-checkbox');if(checkboxIndicator){checkboxIndicator.remove();}const clickHandler=messageClickHandlers.get(message);if(clickHandler){message.removeEventListener('click',clickHandler);messageClickHandlers.delete(message);}message.removeAttribute('data-selectable');});eventListeners.forEach(({element,type,listener,options})=>{element.removeEventListener(type,listener,options);});document.removeEventListener('keydown',keydownHandler);widget.remove();observer.disconnect();window.selectedMessages=[];window.ChatGPTCopyPasterActive=false;}addEventListenerWithTracking(document.getElementById('select-all'),'click',function(e){e.stopPropagation();const messages=findMessages();window.selectedMessages=[];messages.forEach(message=>{toggleMessageSelection(message,true);});showToast(`Selected ${messages.length} messages`);});addEventListenerWithTracking(document.getElementById('deselect-all'),'click',function(e){e.stopPropagation();const messages=findMessages();messages.forEach(message=>{toggleMessageSelection(message,false);});window.selectedMessages=[];showToast('All messages deselected');});addEventListenerWithTracking(document.getElementById('copy-selected'),'click',function(e){e.stopPropagation();copySelectedMessages();});const keydownHandler=function(e){if((e.ctrlKey||e.metaKey)&&e.key==='c'){if(window.getSelection().toString().length===0&&window.selectedMessages.length>0){e.preventDefault();copySelectedMessages();}}};addEventListenerWithTracking(document,'keydown',keydownHandler);setupMessages();})();
```

4. Save the bookmark

## Usage

1. Visit [chat.openai.com](https://chat.openai.com)
2. Click the "ChatGPT Export" bookmark in your bookmarks bar
3. A floating panel will appear in the bottom-right corner of your screen
4. Click on any messages to select them (they will be highlighted with a green border)
5. Use the "Select All" button to select all messages at once
6. Click "Copy Selected" to copy the selected messages to your clipboard
7. Paste into your document of choice (Google Docs, Microsoft Word, etc.)
8. Click the "✕" button to close the export panel when you're done

## How It Works

This bookmarklet:

1. Injects a small UI panel into the ChatGPT interface
2. Makes ChatGPT messages selectable with a simple click
3. Uses the modern Clipboard API to copy selected messages in both formatted (HTML) and plain text formats
4. Includes fallbacks for browsers that don't support advanced clipboard features
5. Carefully preserves formatting like code blocks, tables, and styled text
6. Tracks messages by their position in the conversation to ensure correct ordering


## Benefits Over Extensions

- No installation required
- No special permissions needed
- Works instantly
- No risk of tracking or data collection
- Stays up to date with ChatGPT's interface changes
- Simple and lightweight

## Contributing

Contributions are welcome! Feel free to submit pull requests or open issues if you have suggestions for improvements.

To contribute:

1. Fork this repository
2. Make your changes
3. Submit a pull request


## Acknowledgements

- Thanks to everyone(GPT4-o and CLAUDE) who contributed to this project!
