"use client";

import type { SyntheticEvent } from "react";

const PLACEHOLDER_BASE = "https://placehold.co";

export const getPlaceholderImage = (
  width: number,
  height: number,
  text = "No Image"
) => {
  const safeWidth = Math.max(10, Math.min(width, 4000));
  const safeHeight = Math.max(10, Math.min(height, 4000));
  const encodedText = encodeURIComponent(text.replace(/\s+/g, " "));
  return `${PLACEHOLDER_BASE}/${safeWidth}x${safeHeight}?text=${encodedText}`;
};

export const handleImageError = (
  event: SyntheticEvent<HTMLImageElement, Event>,
  width: number,
  height: number,
  text?: string
) => {
  event.currentTarget.onerror = null;
  event.currentTarget.src = getPlaceholderImage(width, height, text);
};

