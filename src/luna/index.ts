"use client";

import * as React from "react";
import "./vendor/luna-tokens.css";
import "./vendor/bundle.css";
import type * as T from "./vendor/components";

// The Luna bundle reads React from window.React — set it, then load the bundle
// with require() so it runs AFTER this assignment. Static `import` would be
// hoisted before any module code executes.
if (typeof window !== "undefined") {
  (window as unknown as { React: typeof React }).React = React;
  require("./vendor/bundle.js");
}

const Luna = (typeof window !== "undefined" ? (window as unknown as { Luna: typeof T }).Luna : {}) as typeof T;

export const {
  Button,
  IconButton,
  TextField,
  SearchField,
  Select,
  Menu,
  Toggle,
  Checkbox,
  Radio,
  SegmentedControl,
  Tabs,
  Chip,
  Stepper,
  ProgressBar,
  Calendar,
  Badge,
  CountBadge,
  Tag,
  Avatar,
  AvatarRing,
  StatTile,
  Widget,
  Panel,
  ListRow,
  DataTable,
  AlertCard,
  Banner,
  EmptyState,
  ErrorState,
  Skeleton,
  Toast,
  BarChart,
  LineChart,
  DonutChart,
  Dock,
  TopBar,
  Modal,
  SideSheet,
  BottomSheet,
  AISummary,
  AIAction,
  ProvenanceTag,
  Logo,
  Icon,
  FilterPill,
} = Luna;

export type * from "./vendor/components";
