// Tonearm SVG as base64 data URI
export const tonearmSVG = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAiIGhlaWdodD0iOTAiIHZpZXdCb3g9IjAgMCA5MCA5MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImFybUdyYWQiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjAlIj48c3RvcCBvZmZzZXQ9IjAlIiBzdHlsZT0ic3RvcC1jb2xvcjojYmJiYmJiO3N0b3Atb3BhY2l0eToxIiAvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6Izc3Nzc3NztzdG9wLW9wYWNpdHk6MSIgLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cGF0aCBkPSJNIDcwIDE2IEwgNzAgNjUgTCA1NSA3NSBMIDIwIDc1IEwgMjAgNjIgTCA1NSA2MiBMIDU1IDI4IEwgNjAgMTggWiIgZmlsbD0idXJsKCNhcm1HcmFkKSIgc3Ryb2tlPSIjNTU1NTU1IiBzdHJva2Utd2lkdGg9IjEiLz48L3N2Zz4=";

// Helper function to format time
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
};
