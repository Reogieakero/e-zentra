-- Add parent_link_requested to the NotificationType enum (parent-link flow)
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'parent_link_requested';
