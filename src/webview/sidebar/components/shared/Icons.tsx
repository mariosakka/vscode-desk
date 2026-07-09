import React from 'react';
import {
  Trash2,
  Check,
  X,
  Bookmark,
  FolderOpen,
  Globe,
  FileText,
  ChevronDown,
  Plus,
  Zap,
  GitBranch,
  Pencil,
  BookOpen,
} from 'lucide-react';

type IconProps = { size?: number };

export function TrashIcon({ size = 14 }: IconProps) {
  return <Trash2 size={size} strokeWidth={1.75} />;
}

export function CheckIcon({ size = 12 }: IconProps) {
  return <Check size={size} strokeWidth={2.5} />;
}

export function CloseIcon({ size = 10 }: IconProps) {
  return <X size={size} strokeWidth={2.5} />;
}

export function BookmarkIcon({ size = 11 }: IconProps) {
  return <Bookmark size={size} strokeWidth={1.75} />;
}

export function ProjectIcon({ size = 13 }: IconProps) {
  return <FolderOpen size={size} strokeWidth={1.75} />;
}

export function GlobeIcon({ size = 14 }: IconProps) {
  return <Globe size={size} strokeWidth={1.75} />;
}

export function PageIcon({ size = 13 }: IconProps) {
  return <FileText size={size} strokeWidth={1.75} />;
}

export function ChevronIcon({ size = 10, down = true }: IconProps & { down?: boolean }) {
  return (
    <ChevronDown
      size={size}
      strokeWidth={2}
      style={{ transform: down ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
    />
  );
}

export function PlusIcon({ size = 12 }: IconProps) {
  return <Plus size={size} strokeWidth={2} />;
}

export function SkillIcon({ size = 13 }: IconProps) {
  return <Zap size={size} strokeWidth={1.75} />;
}

export function WorkflowIcon({ size = 13 }: IconProps) {
  return <GitBranch size={size} strokeWidth={1.75} />;
}

export function PencilIcon({ size = 12 }: IconProps) {
  return <Pencil size={size} strokeWidth={1.75} />;
}

export function BookIcon({ size = 13 }: IconProps) {
  return <BookOpen size={size} strokeWidth={1.75} />;
}
