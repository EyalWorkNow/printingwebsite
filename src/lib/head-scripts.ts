// Inline <head> scripts that run before paint (no flash). Plain module on purpose: constants exported from
// "use client" files reach server components as client references, not strings.
// Keys must match components/theme-toggle.tsx ("theme") and components/a11y-menu.tsx ("a11y").
/** Runs before paint (inlined in <head>). */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");document.documentElement.classList.toggle("dark",t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)}catch(e){document.documentElement.classList.add("dark")}`;
/** Runs before paint (inlined in <head>): restores the saved settings. */
export const A11Y_SCRIPT = `try{var a=JSON.parse(localStorage.getItem("a11y")||"{}"),h=document.documentElement;(a.toggles||[]).forEach(function(t){h.classList.add("a11y-"+t)});if(a.size&&a.size!==100)h.style.fontSize=a.size+"%"}catch(e){}`;
