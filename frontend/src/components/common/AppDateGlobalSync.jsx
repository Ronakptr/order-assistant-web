import { useEffect, useRef } from "react";
import {
  getDateSettings,
  initializeDateSettings,
  transformDateTextForApp,
} from "../../utils/appDate";

function shouldSkipNode(node) {
  if (!node || !node.parentElement) return true;

  const parent = node.parentElement;
  const tagName = parent.tagName?.toLowerCase();

  if (
    ["script", "style", "textarea", "input", "select", "option"].includes(
      tagName
    )
  ) {
    return true;
  }

  if (parent.closest("[data-date-sync-ignore='true']")) {
    return true;
  }

  return false;
}

function hasDateLikeText(text) {
  const value = String(text ?? "");

  return (
    /[0-9۰-۹٠-٩]{4}[\/\-.][0-9۰-۹٠-٩]{1,2}[\/\-.][0-9۰-۹٠-٩]{1,2}/.test(
      value
    ) ||
    /[0-9۰-۹٠-٩]{1,2}[\/\-.][0-9۰-۹٠-٩]{1,2}[\/\-.][0-9۰-۹٠-٩]{4}/.test(
      value
    )
  );
}

function syncVisibleDatesInRoot(root, settings) {
  if (!root) return;

  const ownerDocument = root.ownerDocument || document;
  const ownerWindow = ownerDocument.defaultView || window;

  if (!ownerWindow.NodeFilter) return;

  const walker = ownerDocument.createTreeWalker(
    root,
    ownerWindow.NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (shouldSkipNode(node)) {
          return ownerWindow.NodeFilter.FILTER_REJECT;
        }

        if (!hasDateLikeText(node.nodeValue)) {
          return ownerWindow.NodeFilter.FILTER_REJECT;
        }

        return ownerWindow.NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    const currentText = node.nodeValue;
    const nextText = transformDateTextForApp(currentText, settings);

    if (nextText !== currentText) {
      node.nodeValue = nextText;
    }
  });
}

function syncCurrentPageDates(settings = getDateSettings()) {
  syncVisibleDatesInRoot(document.body, settings);
}

function patchPrintWindow(openedWindow) {
  if (!openedWindow || !openedWindow.document) return;

  const win = openedWindow;
  const doc = openedWindow.document;

  if (win.__orderAssistantDatePatched) return;

  const syncPrintWindowDates = () => {
    try {
      syncVisibleDatesInRoot(doc.body || doc.documentElement, getDateSettings());
    } catch {
      // ignore
    }
  };

  const patchDocumentWrite = () => {
    const originalWrite = doc.write?.bind(doc);
    const originalWriteln = doc.writeln?.bind(doc);

    if (originalWrite && !doc.__orderAssistantWritePatched) {
      doc.write = (...args) => {
        const settings = getDateSettings();

        const nextArgs = args.map((arg) => {
          if (typeof arg !== "string") return arg;
          return transformDateTextForApp(arg, settings);
        });

        const result = originalWrite(...nextArgs);

        setTimeout(syncPrintWindowDates, 0);
        setTimeout(syncPrintWindowDates, 80);

        return result;
      };

      doc.__orderAssistantWritePatched = true;
    }

    if (originalWriteln && !doc.__orderAssistantWritelnPatched) {
      doc.writeln = (...args) => {
        const settings = getDateSettings();

        const nextArgs = args.map((arg) => {
          if (typeof arg !== "string") return arg;
          return transformDateTextForApp(arg, settings);
        });

        const result = originalWriteln(...nextArgs);

        setTimeout(syncPrintWindowDates, 0);
        setTimeout(syncPrintWindowDates, 80);

        return result;
      };

      doc.__orderAssistantWritelnPatched = true;
    }
  };

  const patchInnerHTML = () => {
    try {
      const descriptor = Object.getOwnPropertyDescriptor(
        win.Element.prototype,
        "innerHTML"
      );

      if (!descriptor || !descriptor.set || !descriptor.get) return;
      if (win.Element.prototype.__orderAssistantInnerHTMLPatched) return;

      Object.defineProperty(win.Element.prototype, "innerHTML", {
        configurable: true,
        enumerable: descriptor.enumerable,
        get: descriptor.get,
        set(value) {
          const nextValue =
            typeof value === "string"
              ? transformDateTextForApp(value, getDateSettings())
              : value;

          descriptor.set.call(this, nextValue);

          setTimeout(syncPrintWindowDates, 0);
          setTimeout(syncPrintWindowDates, 80);
        },
      });

      win.Element.prototype.__orderAssistantInnerHTMLPatched = true;
    } catch {
      // ignore
    }
  };

  const patchPrint = () => {
    const originalPrint = win.print?.bind(win);

    if (!originalPrint || win.__orderAssistantPrintPatched) return;

    win.print = (...args) => {
      syncPrintWindowDates();
      return originalPrint(...args);
    };

    win.__orderAssistantPrintPatched = true;
  };

  const observePrintWindow = () => {
    try {
      const observer = new win.MutationObserver(() => {
        syncPrintWindowDates();
      });

      observer.observe(doc.documentElement || doc.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });

      win.addEventListener("beforeunload", () => observer.disconnect());
    } catch {
      // ignore
    }
  };

  patchDocumentWrite();
  patchInnerHTML();
  patchPrint();

  try {
    observePrintWindow();
  } catch {
    // ignore
  }

  setTimeout(syncPrintWindowDates, 0);
  setTimeout(syncPrintWindowDates, 80);
  setTimeout(syncPrintWindowDates, 250);

  win.__orderAssistantDatePatched = true;
}

export default function AppDateGlobalSync() {
  const observerRef = useRef(null);
  const syncTimerRef = useRef(null);
  const originalOpenRef = useRef(null);
  const originalPrintRef = useRef(null);

  useEffect(() => {
    initializeDateSettings();

    const scheduleSync = (settings = getDateSettings()) => {
      window.clearTimeout(syncTimerRef.current);

      syncTimerRef.current = window.setTimeout(() => {
        syncCurrentPageDates(settings);
      }, 40);
    };

    const handleDateSettingsUpdate = (event) => {
      const nextSettings = event.detail || getDateSettings();

      initializeDateSettings();
      scheduleSync(nextSettings);
    };

    window.addEventListener(
      "order-assistant-date-settings-updated",
      handleDateSettingsUpdate
    );

    observerRef.current = new MutationObserver(() => {
      scheduleSync(getDateSettings());
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    originalOpenRef.current = window.open;

    window.open = (...args) => {
      const openedWindow = originalOpenRef.current.apply(window, args);

      try {
        patchPrintWindow(openedWindow);
      } catch {
        // ignore
      }

      return openedWindow;
    };

    originalPrintRef.current = window.print;

    window.print = (...args) => {
      syncCurrentPageDates(getDateSettings());
      return originalPrintRef.current.apply(window, args);
    };

    scheduleSync(getDateSettings());

    return () => {
      window.clearTimeout(syncTimerRef.current);

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      if (originalOpenRef.current) {
        window.open = originalOpenRef.current;
      }

      if (originalPrintRef.current) {
        window.print = originalPrintRef.current;
      }

      window.removeEventListener(
        "order-assistant-date-settings-updated",
        handleDateSettingsUpdate
      );
    };
  }, []);

  return null;
}