/**
 * Simple markdown parser for chat messages
 * Supports: **bold**, *italic*, `code`, ~~strikethrough~~, [links](url)
 */

export const parseMarkdown = (text) => {
  if (!text) return '';
  
  let result = text;
  
  // Escape HTML
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Code blocks (must be before inline code)
  result = result.replace(/```([\s\S]*?)```/g, '<pre class="bg-black/30 p-2 rounded my-1 text-sm overflow-x-auto">$1</pre>');
  
  // Inline code
  result = result.replace(/`([^`]+)`/g, '<code class="bg-black/30 px-1 rounded text-purple-300">$1</code>');
  
  // Bold
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold">$1</strong>');
  
  // Italic
  result = result.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');
  
  // Strikethrough
  result = result.replace(/~~([^~]+)~~/g, '<del class="line-through opacity-70">$1</del>');
  
  // Links
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g, 
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 underline">$1</a>'
  );
  
  // Auto-link URLs
  result = result.replace(
    /(?<!["\(])https?:\/\/[^\s<]+/g,
    '<a href="$&" target="_blank" rel="noopener noreferrer" class="text-purple-400 hover:text-purple-300 underline">$&</a>'
  );
  
  // Line breaks
  result = result.replace(/\n/g, '<br>');
  
  return result;
};

/**
 * Common emoji shortcuts
 */
export const emojiShortcuts = {
  ':)': '😊',
  ':(': '😞',
  ':D': '😃',
  ':P': '😛',
  ':O': '😮',
  ';)': '😉',
  '<3': '❤️',
  ':+1:': '👍',
  ':-1:': '👎',
  ':fire:': '🔥',
  ':rocket:': '🚀',
  ':star:': '⭐',
  ':check:': '✅',
  ':x:': '❌',
  ':warning:': '⚠️',
  ':info:': 'ℹ️',
  ':game:': '🎮',
  ':server:': '🖥️',
  ':online:': '🟢',
  ':offline:': '🔴',
};

/**
 * Replace emoji shortcuts with actual emojis
 */
export const replaceEmojiShortcuts = (text) => {
  let result = text;
  Object.entries(emojiShortcuts).forEach(([shortcut, emoji]) => {
    result = result.replace(new RegExp(shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
  });
  return result;
};

/**
 * Process message text (markdown + emoji)
 */
export const processMessage = (text) => {
  const withEmojis = replaceEmojiShortcuts(text);
  return parseMarkdown(withEmojis);
};
