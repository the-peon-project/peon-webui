import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Smile, MoreVertical, Trash2, Ban, History, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Markdown components moved outside to avoid re-creation on each render
const MarkdownLink = ({ node, ...props }) => (
  <a 
    {...props} 
    className="text-sky-400 hover:text-sky-300 underline"
    target="_blank"
    rel="noopener noreferrer"
  />
);

const MarkdownCode = ({ node, inline, ...props }) => (
  inline 
    ? <code className="bg-black/30 px-1 rounded text-sky-300 text-xs" {...props} />
    : <code className="block bg-black/30 p-2 rounded my-1 overflow-x-auto" {...props} />
);

const MarkdownHeading = ({ node, ...props }) => <strong {...props} />;

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
  code: MarkdownCode,
  h1: MarkdownHeading,
  h2: MarkdownHeading,
  h3: MarkdownHeading,
};

/**
 * Extended emoji list with categories
 */
export const EMOJI_DATA = {
  smileys: [
    { emoji: '😊', name: 'smile', keywords: ['happy', 'smile'] },
    { emoji: '😂', name: 'joy', keywords: ['laugh', 'lol', 'funny'] },
    { emoji: '😃', name: 'grin', keywords: ['happy', 'grin'] },
    { emoji: '😄', name: 'happy', keywords: ['happy', 'smile'] },
    { emoji: '😁', name: 'beaming', keywords: ['grin', 'happy'] },
    { emoji: '😆', name: 'laughing', keywords: ['laugh', 'xd'] },
    { emoji: '😅', name: 'sweat_smile', keywords: ['nervous', 'laugh'] },
    { emoji: '🤣', name: 'rofl', keywords: ['laugh', 'rolling'] },
    { emoji: '😉', name: 'wink', keywords: ['wink', 'flirt'] },
    { emoji: '😎', name: 'cool', keywords: ['cool', 'sunglasses'] },
    { emoji: '🤔', name: 'thinking', keywords: ['think', 'hmm'] },
    { emoji: '😐', name: 'neutral', keywords: ['meh', 'neutral'] },
    { emoji: '😑', name: 'expressionless', keywords: ['blank', 'meh'] },
    { emoji: '😶', name: 'no_mouth', keywords: ['silent', 'speechless'] },
    { emoji: '🙄', name: 'eye_roll', keywords: ['rolling', 'eyes'] },
    { emoji: '😏', name: 'smirk', keywords: ['smug', 'smirk'] },
    { emoji: '😣', name: 'persevere', keywords: ['struggle'] },
    { emoji: '😥', name: 'sad', keywords: ['sad', 'disappointed'] },
    { emoji: '😮', name: 'open_mouth', keywords: ['wow', 'surprised'] },
    { emoji: '😯', name: 'hushed', keywords: ['surprised'] },
    { emoji: '😲', name: 'astonished', keywords: ['shocked', 'wow'] },
    { emoji: '😱', name: 'scream', keywords: ['scared', 'shock'] },
    { emoji: '😭', name: 'sob', keywords: ['cry', 'sad'] },
    { emoji: '😤', name: 'triumph', keywords: ['angry', 'huff'] },
    { emoji: '😡', name: 'rage', keywords: ['angry', 'mad'] },
    { emoji: '🤬', name: 'cursing', keywords: ['angry', 'swear'] },
    { emoji: '😈', name: 'smiling_imp', keywords: ['devil', 'evil'] },
    { emoji: '👿', name: 'imp', keywords: ['devil', 'angry'] },
    { emoji: '💀', name: 'skull', keywords: ['dead', 'death'] },
    { emoji: '👻', name: 'ghost', keywords: ['ghost', 'spooky'] },
  ],
  gestures: [
    { emoji: '👍', name: 'thumbsup', keywords: ['yes', 'ok', 'good', '+1'] },
    { emoji: '👎', name: 'thumbsdown', keywords: ['no', 'bad', '-1'] },
    { emoji: '👏', name: 'clap', keywords: ['applause', 'clap'] },
    { emoji: '🙌', name: 'raised_hands', keywords: ['hooray', 'yay'] },
    { emoji: '🤝', name: 'handshake', keywords: ['deal', 'agree'] },
    { emoji: '✋', name: 'hand', keywords: ['stop', 'high5'] },
    { emoji: '👋', name: 'wave', keywords: ['hi', 'bye', 'hello'] },
    { emoji: '🤞', name: 'crossed_fingers', keywords: ['luck', 'hope'] },
    { emoji: '✌️', name: 'v', keywords: ['peace', 'victory'] },
    { emoji: '🤟', name: 'love_you', keywords: ['love', 'rock'] },
    { emoji: '🤘', name: 'metal', keywords: ['rock', 'metal'] },
    { emoji: '💪', name: 'muscle', keywords: ['strong', 'flex'] },
  ],
  hearts: [
    { emoji: '❤️', name: 'heart', keywords: ['love', 'red'] },
    { emoji: '🧡', name: 'orange_heart', keywords: ['love', 'orange'] },
    { emoji: '💛', name: 'yellow_heart', keywords: ['love', 'yellow'] },
    { emoji: '💚', name: 'green_heart', keywords: ['love', 'green'] },
    { emoji: '💙', name: 'blue_heart', keywords: ['love', 'blue'] },
    { emoji: '💜', name: 'heart', keywords: ['love', 'heart'] },
    { emoji: '🖤', name: 'black_heart', keywords: ['love', 'black'] },
    { emoji: '💔', name: 'broken_heart', keywords: ['sad', 'heartbreak'] },
    { emoji: '💕', name: 'two_hearts', keywords: ['love'] },
    { emoji: '💖', name: 'sparkling_heart', keywords: ['love', 'sparkle'] },
  ],
  gaming: [
    { emoji: '🎮', name: 'game', keywords: ['gaming', 'controller', 'video'] },
    { emoji: '🕹️', name: 'joystick', keywords: ['gaming', 'arcade'] },
    { emoji: '🎯', name: 'dart', keywords: ['target', 'bullseye'] },
    { emoji: '🏆', name: 'trophy', keywords: ['win', 'winner', 'champion'] },
    { emoji: '🥇', name: 'first_place', keywords: ['gold', 'winner'] },
    { emoji: '🥈', name: 'second_place', keywords: ['silver'] },
    { emoji: '🥉', name: 'third_place', keywords: ['bronze'] },
    { emoji: '⚔️', name: 'crossed_swords', keywords: ['battle', 'fight', 'pvp'] },
    { emoji: '🛡️', name: 'shield', keywords: ['defense', 'protect'] },
    { emoji: '🗡️', name: 'dagger', keywords: ['knife', 'weapon'] },
    { emoji: '🏹', name: 'bow', keywords: ['arrow', 'archer'] },
    { emoji: '🔫', name: 'gun', keywords: ['weapon', 'fps'] },
    { emoji: '💣', name: 'bomb', keywords: ['explosive', 'boom'] },
    { emoji: '🎲', name: 'dice', keywords: ['random', 'rng', 'roll'] },
    { emoji: '♟️', name: 'chess', keywords: ['strategy'] },
  ],
  tech: [
    { emoji: '🖥️', name: 'server', keywords: ['computer', 'desktop', 'pc'] },
    { emoji: '💻', name: 'laptop', keywords: ['computer'] },
    { emoji: '🔧', name: 'wrench', keywords: ['fix', 'tool', 'settings'] },
    { emoji: '⚙️', name: 'gear', keywords: ['settings', 'config'] },
    { emoji: '🔌', name: 'plug', keywords: ['power', 'connect'] },
    { emoji: '📡', name: 'antenna', keywords: ['signal', 'network'] },
    { emoji: '🌐', name: 'globe', keywords: ['web', 'internet', 'world'] },
    { emoji: '🔒', name: 'lock', keywords: ['secure', 'locked'] },
    { emoji: '🔓', name: 'unlock', keywords: ['open', 'unlocked'] },
    { emoji: '🔑', name: 'key', keywords: ['password', 'access'] },
  ],
  status: [
    { emoji: '✅', name: 'check', keywords: ['yes', 'done', 'complete'] },
    { emoji: '❌', name: 'x', keywords: ['no', 'wrong', 'error'] },
    { emoji: '⚠️', name: 'warning', keywords: ['alert', 'caution'] },
    { emoji: '🚫', name: 'no_entry', keywords: ['forbidden', 'stop'] },
    { emoji: '🟢', name: 'green_circle', keywords: ['online', 'active', 'go'] },
    { emoji: '🔴', name: 'red_circle', keywords: ['offline', 'stop', 'error'] },
    { emoji: '🟡', name: 'yellow_circle', keywords: ['pending', 'warning'] },
    { emoji: '🔵', name: 'blue_circle', keywords: ['info'] },
    { emoji: '⏳', name: 'hourglass', keywords: ['waiting', 'loading'] },
    { emoji: '⏰', name: 'alarm', keywords: ['time', 'clock'] },
  ],
  symbols: [
    { emoji: '🔥', name: 'fire', keywords: ['hot', 'lit', 'flame'] },
    { emoji: '⭐', name: 'star', keywords: ['favorite', 'best'] },
    { emoji: '🌟', name: 'glowing_star', keywords: ['sparkle', 'shine'] },
    { emoji: '✨', name: 'sparkles', keywords: ['magic', 'new'] },
    { emoji: '💯', name: '100', keywords: ['perfect', 'hundred'] },
    { emoji: '🚀', name: 'rocket', keywords: ['launch', 'fast', 'ship'] },
    { emoji: '💡', name: 'bulb', keywords: ['idea', 'light'] },
    { emoji: '🎉', name: 'party', keywords: ['celebrate', 'tada'] },
    { emoji: '🎊', name: 'confetti', keywords: ['celebrate'] },
    { emoji: '👀', name: 'eyes', keywords: ['look', 'see', 'watching'] },
    { emoji: '💤', name: 'zzz', keywords: ['sleep', 'tired'] },
    { emoji: '💬', name: 'speech', keywords: ['chat', 'message'] },
    { emoji: '❓', name: 'question', keywords: ['what', 'ask'] },
    { emoji: '❗', name: 'exclamation', keywords: ['important', 'alert'] },
  ],
};

// Flatten all emojis for search
export const ALL_EMOJIS = Object.values(EMOJI_DATA).flat();

// Emoji shortcuts for quick typing
export const emojiShortcuts = {
  ':)': '😊',
  ':-)': '😊',
  ':(': '😞',
  ':-(': '😞',
  ':D': '😃',
  ':-D': '😃',
  ':P': '😛',
  ':-P': '😛',
  ':O': '😮',
  ':-O': '😮',
  ';)': '😉',
  ';-)': '😉',
  '<3': '❤️',
  '</3': '💔',
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
  ':+1:': '👍',
  ':-1:': '👎',
  ':thumbsup:': '👍',
  ':thumbsdown:': '👎',
  ':clap:': '👏',
  ':100:': '💯',
  ':eyes:': '👀',
  ':thinking:': '🤔',
  ':party:': '🎉',
  ':tada:': '🎉',
};

/**
 * Replace emoji shortcuts with actual emojis
 */
export const replaceEmojiShortcuts = (text) => {
  if (!text) return '';
  let result = text;
  Object.entries(emojiShortcuts).forEach(([shortcut, emoji]) => {
    const escaped = shortcut.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), emoji);
  });
  return result;
};

/**
 * Emoji Picker Component - Fixed layout
 */
export const EmojiPicker = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [search, setSearch] = useState('');
  const pickerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = useMemo(() => {
    if (!search) return EMOJI_DATA[activeCategory] || [];
    const query = search.toLowerCase();
    return ALL_EMOJIS.filter(e => 
      e.name.includes(query) || 
      e.keywords.some(k => k.includes(query))
    );
  }, [search, activeCategory]);

  const categories = [
    { id: 'smileys', label: '😊' },
    { id: 'gestures', label: '👍' },
    { id: 'hearts', label: '❤️' },
    { id: 'gaming', label: '🎮' },
    { id: 'tech', label: '🖥️' },
    { id: 'status', label: '✅' },
    { id: 'symbols', label: '🔥' },
  ];

  return (
    <div 
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 animate-fade-in"
      data-testid="emoji-picker"
    >
      {/* Header with search */}
      <div className="p-2 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search emojis..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded"
          autoFocus
        />
      </div>

      {/* Category tabs */}
      {!search && (
        <div className="flex border-b border-gray-700">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex-1 py-2 text-lg hover:bg-gray-800 transition-colors ${
                activeCategory === cat.id ? 'bg-gray-800 border-b-2 border-sky-500' : ''
              }`}
              title={cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Emoji grid */}
      <div className="p-2 h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((item) => (
            <button
              key={item.name}
              onClick={() => onSelect(item.emoji)}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-700 rounded text-xl transition-colors"
              title={`:${item.name}:`}
            >
              {item.emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <div className="text-center text-gray-500 py-4">No emojis found</div>
        )}
      </div>

      {/* Shortcut hint */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500">
        Type <code className="bg-gray-800 px-1 rounded">:name:</code> for quick insert
      </div>
    </div>
  );
};

/**
 * Inline Emoji Autocomplete Component
 */
export const EmojiAutocomplete = ({ query, onSelect, position }) => {
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    const search = query.toLowerCase();
    return ALL_EMOJIS
      .filter(e => e.name.startsWith(search) || e.keywords.some(k => k.startsWith(search)))
      .slice(0, 8);
  }, [query]);

  if (suggestions.length === 0) return null;

  return (
    <div 
      className="absolute bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 w-64 max-h-48 overflow-y-auto animate-fade-in"
      style={{ bottom: '100%', left: position, marginBottom: '8px' }}
    >
      {suggestions.map((item, idx) => (
        <button
          key={item.name}
          onClick={() => onSelect(item.emoji, item.name)}
          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-left ${
            idx === 0 ? 'bg-gray-800' : ''
          }`}
        >
          <span className="text-xl">{item.emoji}</span>
          <span className="text-sm text-gray-300">:{item.name}:</span>
        </button>
      ))}
    </div>
  );
};

/**
 * Chat Message Component with Markdown support
 */
export const ChatMessage = ({ 
  message, 
  isOwn, 
  canModerate, 
  onDelete, 
  onBanUser,
  onDeleteHistory 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const processedMessage = replaceEmojiShortcuts(message.message);

  return (
    <div 
      className={`chat-message group py-2 px-3 rounded-lg transition-colors ${
        isOwn ? 'bg-slate-900/20' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`font-semibold text-sm ${isOwn ? 'text-sky-400' : 'text-gray-300'}`}>
              {message.username}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          <div className="text-sm text-gray-200 break-words prose prose-invert prose-sm max-w-none">
            <ReactMarkdown components={MARKDOWN_COMPONENTS}>
              {processedMessage}
            </ReactMarkdown>
          </div>
        </div>

        {/* Moderation Menu */}
        {canModerate && !isOwn && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[160px] animate-fade-in">
                <button
                  onClick={() => { onDelete?.(message.id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-left"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Delete Message
                </button>
                <button
                  onClick={() => { onDeleteHistory?.(message.user_id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-left"
                >
                  <History className="w-4 h-4 text-orange-400" />
                  Delete All Messages
                </button>
                <button
                  onClick={() => { onBanUser?.(message.user_id); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-left"
                >
                  <Ban className="w-4 h-4 text-red-400" />
                  Ban from Chat
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Chat Input Component with emoji autocomplete
 */
export const ChatInput = ({ onSend, disabled, placeholder = "Type a message..." }) => {
  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart;
    setMessage(value);
    setCursorPosition(cursor);

    // Check for emoji autocomplete trigger
    const textBeforeCursor = value.slice(0, cursor);
    const colonMatch = textBeforeCursor.match(/:([a-z0-9_]*)$/i);
    
    if (colonMatch && colonMatch[1].length >= 2) {
      setEmojiQuery(colonMatch[1]);
    } else {
      setEmojiQuery('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      setEmojiQuery('');
    }
  };

  const insertEmoji = (emoji) => {
    setMessage(prev => prev + emoji);
    setShowEmoji(false);
    setEmojiQuery('');
    inputRef.current?.focus();
  };

  const insertEmojiFromAutocomplete = (emoji, name) => {
    // Replace the :query with the emoji
    const textBeforeCursor = message.slice(0, cursorPosition);
    const textAfterCursor = message.slice(cursorPosition);
    const colonIndex = textBeforeCursor.lastIndexOf(':');
    
    if (colonIndex !== -1) {
      const newText = textBeforeCursor.slice(0, colonIndex) + emoji + textAfterCursor;
      setMessage(newText);
    }
    setEmojiQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Handle Enter to select first autocomplete suggestion
    if (e.key === 'Enter' && emojiQuery) {
      const suggestions = ALL_EMOJIS.filter(em => 
        em.name.startsWith(emojiQuery.toLowerCase()) || 
        em.keywords.some(k => k.startsWith(emojiQuery.toLowerCase()))
      );
      if (suggestions.length > 0) {
        e.preventDefault();
        insertEmojiFromAutocomplete(suggestions[0].emoji, suggestions[0].name);
        return;
      }
    }
    
    // Handle Tab to select first autocomplete suggestion
    if (e.key === 'Tab' && emojiQuery) {
      e.preventDefault();
      const suggestions = ALL_EMOJIS.filter(em => 
        em.name.startsWith(emojiQuery.toLowerCase()) || 
        em.keywords.some(k => k.startsWith(emojiQuery.toLowerCase()))
      );
      if (suggestions.length > 0) {
        insertEmojiFromAutocomplete(suggestions[0].emoji, suggestions[0].name);
      }
    }

    // Handle Escape to close autocomplete
    if (e.key === 'Escape') {
      setEmojiQuery('');
      setShowEmoji(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex gap-2 items-center">
      {/* Emoji Picker Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-2 hover:bg-white/10 rounded transition-colors"
          disabled={disabled}
        >
          <Smile className="w-5 h-5 text-gray-400" />
        </button>
        {showEmoji && (
          <EmojiPicker 
            onSelect={insertEmoji} 
            onClose={() => setShowEmoji(false)} 
          />
        )}
      </div>
      
      {/* Input with autocomplete */}
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full"
          maxLength={1000}
          data-testid="chat-input"
        />
        
        {/* Emoji Autocomplete */}
        {emojiQuery && (
          <EmojiAutocomplete
            query={emojiQuery}
            onSelect={insertEmojiFromAutocomplete}
            position={0}
          />
        )}
      </div>
      
      <button
        type="submit"
        disabled={!message.trim() || disabled}
        className="gold-button px-4 py-2 rounded disabled:opacity-50"
        data-testid="send-chat-btn"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
};

export default ChatMessage;
