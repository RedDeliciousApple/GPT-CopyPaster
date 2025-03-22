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
javascript:(function(){if(window.ChatGPTExportUI)return;const e=document.createElement("div");e.id="chatgpt-export-ui",e.style.position="fixed",e.style.bottom="20px",e.style.right="20px",e.style.zIndex="9999",e.style.background="#f0f4f9",e.style.border="1px solid #c9d7e8",e.style.borderRadius="8px",e.style.boxShadow="0 2px 10px rgba(0,0,0,0.1)",e.style.fontFamily="Arial, sans-serif",e.style.fontSize="14px",e.style.color="#333",e.style.width="250px",e.innerHTML='<div style="background:#10a37f;color:white;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move;border-top-left-radius:8px;border-top-right-radius:8px;"><span style="font-weight:bold;">ChatGPT Export</span><button id="close-export" style="background:none;border:none;color:white;font-size:16px;cursor:pointer;">✕</button></div><div style="padding:12px;display:flex;flex-direction:column;gap:8px;"><button id="select-all" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Select All</button><button id="deselect-all" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Deselect All</button><button id="copy-selected" style="padding:6px 10px;background:#f0f4f9;border:1px solid #c9d7e8;border-radius:4px;cursor:pointer;">Copy Selected</button><div id="status-message" style="margin-top:8px;font-size:12px;text-align:center;"></div></div>',document.body.appendChild(e),window.ChatGPTExportUI=!0,window.selectedMessages=[];const t=e.querySelector("div");let s=!1,o,l;function n(e,t=!1){const s=document.getElementById("status-message");s.textContent=e,s.style.backgroundColor=t?"#fbecec":"#e7f3ef",s.style.color=t?"#e45858":"#10a37f",s.style.padding="5px",s.style.borderRadius="4px",setTimeout(()=>{s.textContent="",s.style.backgroundColor="",s.style.color="",s.style.padding=""},3e3)}function i(){return Array.from(document.querySelectorAll('[data-message-author-role="user"], [data-message-author-role="assistant"]')).filter(e=>!e.closest('[data-testid="conversation-turn-counter"]'))}function a(e,t=null){const s=null!==t?t:!e.classList.contains("selected-message");return s?(e.classList.add("selected-message"),e.style.boxShadow="0 0 0 2px #10a37f",window.selectedMessages.includes(e)||window.selectedMessages.push(e)):(e.classList.remove("selected-message"),e.style.boxShadow="",window.selectedMessages=window.selectedMessages.filter(t=>t!==e)),s}function r(){i().forEach(e=>{if("true"===e.dataset.selectable)return;e.dataset.selectable="true",a(e,!1),e.addEventListener("click",function(t){t.target.tagName!=="A"&&t.target.tagName!=="BUTTON"&&!t.target.closest("a")&&!t.target.closest("button")&&a(e)})})}function c(e){const t="user"===e.getAttribute("data-message-author-role")?"You":"ChatGPT",s=e.querySelector(".markdown-content, .markdown, .whitespace-pre-wrap");if(!s)return`<p><strong>${t}:</strong> [Content not found]</p>`;const o=s.cloneNode(!0);return`<div><p><strong>${t}:</strong></p>${o.innerHTML}</div>`}function d(e){const t="user"===e.getAttribute("data-message-author-role")?"You":"ChatGPT",s=e.querySelector(".markdown-content, .markdown, .whitespace-pre-wrap");return s?`${t}:\n${s.textContent.trim()}\n\n`:`${t}: [Content not found]`}t.addEventListener("mousedown",function(e){s=!0,o=e.clientX-e.getBoundingClientRect().left,l=e.clientY-e.getBoundingClientRect().top}),document.addEventListener("mousemove",function(t){if(!s)return;const n=t.clientX-o,i=t.clientY-l;e.style.left=`${n}px`,e.style.right="auto",e.style.top=`${i}px`,e.style.bottom="auto"}),document.addEventListener("mouseup",function(){s=!1}),r();const u=new MutationObserver(function(){r()}),m=document.querySelector("main")||document.body;u.observe(m,{childList:!0,subtree:!0}),document.getElementById("select-all").addEventListener("click",function(){const e=i();window.selectedMessages=[],e.forEach(e=>{a(e,!0)}),n(`Selected ${e.length} messages`)}),document.getElementById("deselect-all").addEventListener("click",function(){i().forEach(e=>{a(e,!1)}),window.selectedMessages=[],n("All messages deselected")}),document.getElementById("copy-selected").addEventListener("click",function(){if(0===window.selectedMessages.length)return void n("No messages selected",!0);const e=[...window.selectedMessages].sort((e,t)=>{const s=e.compareDocumentPosition(t);return s&Node.DOCUMENT_POSITION_FOLLOWING?-1:1});let t="",s="";e.forEach(e=>{t+=c(e),s+=d(e)}),t=`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${t}</body></html>`;const o=e.length;try{navigator.clipboard.write&&ClipboardItem?navigator.clipboard.write([new ClipboardItem({"text/html":new Blob([t],{type:"text/html"}),"text/plain":new Blob([s],{type:"text/plain"})})]).then(()=>{n(`Copied ${o} messages`)}).catch(e=>{n(`Error copying: ${e}`,!0),navigator.clipboard.writeText(s).then(()=>{n(`Copied ${o} messages`)})}):navigator.clipboard.writeText(s).then(()=>{n(`Copied ${o} messages`)}).catch(e=>{n(`Error copying: ${e}`,!0)})}catch(e){n("Advanced clipboard features not supported. Using plain text.",!0),navigator.clipboard.writeText(s).then(()=>{n(`Copied ${o} messages`)}).catch(e=>{n(`Error copying: ${e}`,!0)})}}),document.getElementById("close-export").addEventListener("click",function(){window.selectedMessages.forEach(e=>{e.classList.remove("selected-message"),e.style.boxShadow=""}),e.remove(),u.disconnect(),window.selectedMessages=[],window.ChatGPTExportUI=!1})})();
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
