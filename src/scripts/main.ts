/**
 * main.ts
 * メインスクリプト
 */
import { setupThemeToggle } from "@scripts/theme";
import { setupLanguageSwitcher } from "@scripts/language";
import { setupSidebar, setupSidebarToggle } from "@scripts/sidebar";
import { setupToc, setupTocDrawer } from "@scripts/toc";

// テーマと言語の初期化
setupThemeToggle();
setupLanguageSwitcher();

// サイドバーのセットアップ
setupSidebar();
setupSidebarToggle();

// TOC関連のセットアップ
setupToc();
setupTocDrawer();
