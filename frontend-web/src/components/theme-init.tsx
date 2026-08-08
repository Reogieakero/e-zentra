"use client";

import { useServerInsertedHTML } from "next/navigation";
import { STORAGE_KEY } from "@/constants/storage";

const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export function ThemeInitScript() {
  useServerInsertedHTML(() => (
    <script id="theme-init" dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
  ));
  return null;
}