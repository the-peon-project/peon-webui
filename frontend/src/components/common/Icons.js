import { 
  Play, Square, RefreshCw, ArrowUpCircle, Info, Settings, 
  Plus, Trash2, Edit, Users, Server, Home, Shield, LogOut,
  Sun, Moon, ChevronDown, ChevronRight, Search, Grid, List,
  MessageSquare, Calendar, Activity, Wifi, WifiOff, AlertCircle,
  Check, X, Clock, Cpu, HardDrive, Zap, Send, Smile, MoreVertical,
  Ban, UserX, History, FileText, Eye, EyeOff, Lock, Unlock,
  Link, Unlink, ToggleLeft, ToggleRight, Download, Upload,
  Loader2, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

// Icon mapping for consistent usage
export const Icons = {
  // Actions
  play: Play,
  stop: Square,
  restart: RefreshCw,
  update: ArrowUpCircle,
  info: Info,
  settings: Settings,
  add: Plus,
  delete: Trash2,
  edit: Edit,
  send: Send,
  download: Download,
  upload: Upload,
  
  // Navigation
  home: Home,
  servers: Server,
  users: Users,
  shield: Shield,
  logout: LogOut,
  
  // Theme
  sun: Sun,
  moon: Moon,
  
  // UI
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  search: Search,
  grid: Grid,
  list: List,
  moreVertical: MoreVertical,
  eye: Eye,
  eyeOff: EyeOff,
  
  // Features
  chat: MessageSquare,
  calendar: Calendar,
  activity: Activity,
  history: History,
  fileText: FileText,
  
  // Status
  online: Wifi,
  offline: WifiOff,
  alert: AlertCircle,
  check: Check,
  x: X,
  clock: Clock,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
  
  // Stats
  cpu: Cpu,
  memory: HardDrive,
  power: Zap,
  
  // Chat
  smile: Smile,
  ban: Ban,
  userX: UserX,
  
  // Access
  lock: Lock,
  unlock: Unlock,
  link: Link,
  unlink: Unlink,
  
  // Toggle
  toggleOn: ToggleRight,
  toggleOff: ToggleLeft,
  
  // Loading
  loader: Loader2,
};

export default Icons;
