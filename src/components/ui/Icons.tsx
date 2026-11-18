import React from "react";
import {
  Calendar,
  LayoutGrid,
  SlidersHorizontal,
  Download,
  ArrowLeftRight,
  Clock,
  MapPin,
  User,
  Radio,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Check,
  Coffee,
  Sparkles,
  Moon,
  Sun,
  Info,
  HelpCircle,
  Bell,
  Trash2,
  Plus,
  FileText,
  Image as LucideImage,
  X,
  Search,
  RotateCcw,
  ArrowRight,
  Share2,
  Layers,
  BookOpen,
  Star,
  ExternalLink,
  Copy,
} from "lucide-react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

export function CalendarIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Calendar className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function GridIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <LayoutGrid className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function SlidersIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <SlidersHorizontal className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function DownloadIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Download className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function TransferIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ArrowLeftRight className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ClockIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Clock className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function MapPinIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <MapPin className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function UserIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <User className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function RadioIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Radio className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function AlertCircleIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <AlertCircle className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ChevronRightIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ChevronRight className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ChevronLeftIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ChevronLeft className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ChevronDownIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ChevronDown className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ChevronUpIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ChevronUp className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function CheckIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Check className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function CoffeeIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Coffee className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function SparklesIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Sparkles className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function MoonIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Moon className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function SunIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Sun className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function InfoIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Info className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function BellIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Bell className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function HelpCircleIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <HelpCircle className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function TrashIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Trash2 className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function PlusIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Plus className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function FileTextIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <FileText className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ImageIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <LucideImage className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function XIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <X className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function SearchIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Search className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function RotateCcwIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <RotateCcw className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ArrowRightIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ArrowRight className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ShareIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Share2 className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function LayersIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Layers className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function CopyIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Copy className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function BookOpenIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <BookOpen className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

/**
 * RoutineKit Official Academic Mark & Crest
 */
export function RoutineKitMark({ className = "w-7 h-7", size, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      width={size || 28}
      height={size || 28}
      aria-hidden="true"
      {...props}
    >
      <rect
        width="32"
        height="32"
        rx="9"
        fill="var(--logo-bg, #09090b)"
        className="fill-zinc-950 dark:fill-zinc-100 transition-colors"
      />
      {/* Clean minimal 'R' monogram - high contrast in both themes */}
      <path
        d="M10 24.5V8.5C10 7.67 10.67 7 11.5 7H16.5C19.8 7 22 9.1 22 12C22 14.9 19.8 17 16.5 17H10"
        stroke="var(--logo-ink, #ffffff)"
        className="stroke-white dark:stroke-zinc-950 transition-colors"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 17L21.5 24.5"
        stroke="var(--logo-ink, #ffffff)"
        className="stroke-white dark:stroke-zinc-950 transition-colors"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function StarIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <Star className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function ExternalLinkIcon({ className = "w-4 h-4", size, strokeWidth = 1.75, ...props }: IconProps) {
  return <ExternalLink className={className} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function GithubIcon({ className = "w-4 h-4", ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}
