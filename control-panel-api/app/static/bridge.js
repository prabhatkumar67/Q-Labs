(function () {
  if (window.__SANDBOX_BRIDGE_ACTIVE) return;
  window.__SANDBOX_BRIDGE_ACTIVE = true;

  // The bridge is loaded via the proxy, so parent origin is the proxy origin
  var PARENT_ORIGIN = "*"; // We accept commands from any parent since the proxy controls injection

  var clickListener = null;
  var inputListener = null;
  var stepIndex = 0;

  function getCssPath(el) {
    var parts = [];
    var current = el;
    while (current && current !== document.body && current !== document.documentElement) {
      var selector = current.tagName.toLowerCase();
      if (current.parentElement) {
        var siblings = Array.from(current.parentElement.children).filter(
          function (c) { return c.tagName === current.tagName; }
        );
        if (siblings.length > 1) {
          var index = siblings.indexOf(current) + 1;
          selector += ":nth-of-type(" + index + ")";
        }
      }
      parts.unshift(selector);
      current = current.parentElement;
    }
    return parts.join(" > ");
  }

  function getSelector(el) {
    // Priority 1: data-testid on element or nearest ancestor
    var current = el;
    while (current) {
      var testId = current.getAttribute("data-testid");
      if (testId) {
        return {
          selector: '[data-testid="' + testId + '"]',
          fallbackSelectors: [getCssPath(el)]
        };
      }
      current = current.parentElement;
    }
    // Priority 2: CSS path
    return { selector: getCssPath(el), fallbackSelectors: [] };
  }

  function getRect(el) {
    var rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left
    };
  }

  // Poll for an element by selector (+ fallbacks) until found or timeout
  function findElement(selector, fallbackSelectors, timeout, callback) {
    function tryFind() {
      var el = document.querySelector(selector);
      if (!el && fallbackSelectors) {
        for (var i = 0; i < fallbackSelectors.length; i++) {
          el = document.querySelector(fallbackSelectors[i]);
          if (el) break;
        }
      }
      return el;
    }

    var el = tryFind();
    if (el) return callback(el);

    var start = Date.now();
    var poll = setInterval(function () {
      el = tryFind();
      if (el) {
        clearInterval(poll);
        callback(el);
      } else if (Date.now() - start > timeout) {
        clearInterval(poll);
        callback(null);
      }
    }, 200);
  }

  // Track URL changes from in-app navigation (pushState, replaceState, popstate, click-driven)
  var lastKnownPath = window.location.pathname + window.location.search;

  function notifyUrlChange() {
    var currentPath = window.location.pathname + window.location.search;
    if (currentPath !== lastKnownPath) {
      lastKnownPath = currentPath;
      window.parent.postMessage({ type: "url-changed", path: window.location.pathname, search: window.location.search }, "*");
    }
  }

  // Patch pushState and replaceState to detect SPA navigations
  var origPushState = history.pushState;
  history.pushState = function () {
    origPushState.apply(this, arguments);
    notifyUrlChange();
  };
  var origReplaceState = history.replaceState;
  history.replaceState = function () {
    origReplaceState.apply(this, arguments);
    notifyUrlChange();
  };
  window.addEventListener("popstate", notifyUrlChange);

  // Poll as a fallback for navigations we can't intercept (e.g. Next.js soft nav)
  setInterval(notifyUrlChange, 500);

  // Notify parent that bridge is ready — wait for DOM to be interactive so React can hydrate
  function sendBridgeReady() {
    window.parent.postMessage({ type: "bridge-ready", path: window.location.pathname }, "*");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", sendBridgeReady);
  } else {
    sendBridgeReady();
  }

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    var type = data.type;

    if (type === "start-capture") {
      // Remove existing listeners if any
      if (clickListener) document.removeEventListener("click", clickListener, true);
      if (inputListener) document.removeEventListener("change", inputListener, true);
      stepIndex = 0;

      clickListener = function (e) {
        var target = e.target;
        if (!target || !target.tagName) return;
        var info = getSelector(target);
        var step = {
          index: stepIndex++,
          timestamp: Date.now(),
          url: window.location.pathname,
          selector: info.selector,
          fallbackSelectors: info.fallbackSelectors,
          elementTag: target.tagName,
          elementText: (target.textContent || "").trim().slice(0, 100),
          pageTitle: document.title,
          action: "click"
        };
        window.parent.postMessage({ type: "step-captured", step: step }, "*");
      };

      inputListener = function (e) {
        var target = e.target;
        if (!target) return;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) return;
        var info = getSelector(target);
        var step = {
          index: stepIndex++,
          timestamp: Date.now(),
          url: window.location.pathname,
          selector: info.selector,
          fallbackSelectors: info.fallbackSelectors,
          elementTag: target.tagName,
          elementText: "",
          pageTitle: document.title,
          action: "input",
          inputValue: target.value || target.textContent || "",
          inputType: target.type || "text"
        };
        window.parent.postMessage({ type: "step-captured", step: step }, "*");
      };

      document.addEventListener("click", clickListener, true);
      document.addEventListener("change", inputListener, true);
      window.parent.postMessage({ type: "capture-started" }, "*");
    }

    if (type === "stop-capture") {
      if (clickListener) {
        document.removeEventListener("click", clickListener, true);
        clickListener = null;
      }
      if (inputListener) {
        document.removeEventListener("change", inputListener, true);
        inputListener = null;
      }
      window.parent.postMessage({ type: "capture-stopped" }, "*");
    }

    if (type === "replay-click") {
      var selector = data.selector;
      var fallbackSelectors = data.fallbackSelectors;
      var index = data.index;

      findElement(selector, fallbackSelectors, 5000, function (el) {
        if (el) {
          var rect = getRect(el);
          el.scrollIntoView({ behavior: "smooth", block: "center" });

          // Send location for overlay
          window.parent.postMessage({
            type: "replay-click-location",
            x: rect.x, y: rect.y, width: rect.width, height: rect.height,
            index: index
          }, "*");

          setTimeout(function () {
            el.click();
            setTimeout(function () {
              window.parent.postMessage(
                { type: "replay-click-done", index: index, success: true }, "*"
              );
            }, 300);
          }, 500);
        } else {
          window.parent.postMessage(
            { type: "replay-click-done", index: index, success: false, error: "Element not found" }, "*"
          );
        }
      });
    }

    if (type === "replay-input") {
      var selector2 = data.selector;
      var fallbackSelectors2 = data.fallbackSelectors;
      var value = data.value;
      var index2 = data.index;

      findElement(selector2, fallbackSelectors2, 5000, function (el2) {
        if (el2) {
          var rect2 = getRect(el2);
          el2.scrollIntoView({ behavior: "smooth", block: "center" });

          window.parent.postMessage({
            type: "replay-click-location",
            x: rect2.x, y: rect2.y, width: rect2.width, height: rect2.height,
            index: index2
          }, "*");

          el2.focus();
          // Use native setter for React compatibility
          var nativeSetter =
            Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value") ||
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value");
          if (nativeSetter && nativeSetter.set) {
            nativeSetter.set.call(el2, value);
          } else {
            el2.value = value;
          }
          el2.dispatchEvent(new Event("input", { bubbles: true }));
          el2.dispatchEvent(new Event("change", { bubbles: true }));

          setTimeout(function () {
            window.parent.postMessage(
              { type: "replay-input-done", index: index2, success: true }, "*"
            );
          }, 300);
        } else {
          window.parent.postMessage(
            { type: "replay-input-done", index: index2, success: false, error: "Element not found" }, "*"
          );
        }
      });
    }

    if (type === "capture-dom") {
      var clone = document.body.cloneNode(true);

      // Remove non-interactive elements
      var removeSelectors = "script, style, noscript, link, meta, svg, iframe, video, audio, canvas, map, picture, source";
      clone.querySelectorAll(removeSelectors).forEach(function (el) { el.remove(); });

      // Remove hidden elements by attribute
      clone.querySelectorAll('[aria-hidden="true"], [hidden]').forEach(function (el) { el.remove(); });

      var keepAttrs = ["id", "data-testid", "aria-label", "href", "type", "name",
        "placeholder", "value", "disabled", "role", "tabindex", "for", "alt", "title",
        "action", "method", "src"];

      var allEls = clone.querySelectorAll("*");
      for (var ci = 0; ci < allEls.length; ci++) {
        var cel = allEls[ci];

        // Check computed visibility
        var origEl = document.body.querySelectorAll(cel.tagName.toLowerCase())[ci];
        if (origEl) {
          try {
            var computed = window.getComputedStyle(origEl);
            if (computed.display === "none" || computed.visibility === "hidden") {
              cel.remove();
              continue;
            }
          } catch (e) { /* ignore */ }
        }

        // Strip all attributes except useful ones
        var attrs = Array.from(cel.attributes);
        for (var cj = 0; cj < attrs.length; cj++) {
          var attrName = attrs[cj].name;
          if (keepAttrs.indexOf(attrName) === -1 && attrName !== "data-testid") {
            cel.removeAttribute(attrName);
          }
        }

        // Truncate src to avoid long data URIs
        if (cel.hasAttribute("src")) {
          var srcVal = cel.getAttribute("src");
          if (srcVal && srcVal.length > 100) {
            cel.setAttribute("src", srcVal.substring(0, 100) + "...");
          }
        }
      }

      // Truncate long text nodes
      var walker = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT, null, false);
      var textNode;
      while ((textNode = walker.nextNode())) {
        var trimmed = textNode.textContent.replace(/\s+/g, " ").trim();
        if (trimmed.length > 200) {
          textNode.textContent = trimmed.substring(0, 200) + "...";
        } else if (trimmed.length === 0) {
          textNode.textContent = "";
        } else {
          textNode.textContent = trimmed;
        }
      }

      // Remove empty elements (no text, no children with text)
      var emptyEls = clone.querySelectorAll("*");
      for (var ek = emptyEls.length - 1; ek >= 0; ek--) {
        var eel = emptyEls[ek];
        if (!eel.textContent.trim() && !eel.querySelector("input, textarea, select, button, a, img") && !eel.hasAttribute("data-testid")) {
          eel.remove();
        }
      }

      var html = clone.innerHTML;
      window.parent.postMessage({
        type: "dom-captured",
        html: html,
        url: window.location.pathname,
        title: document.title
      }, "*");
    }

    if (type === "wait-for-stable") {
      var stableTimer = null;
      var stableTimeout = null;
      var observer = new MutationObserver(function () {
        if (stableTimer) clearTimeout(stableTimer);
        stableTimer = setTimeout(function () {
          observer.disconnect();
          if (stableTimeout) clearTimeout(stableTimeout);
          window.parent.postMessage({ type: "dom-stable" }, "*");
        }, 500);
      });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      // Start initial timer in case DOM is already stable
      stableTimer = setTimeout(function () {
        observer.disconnect();
        if (stableTimeout) clearTimeout(stableTimeout);
        window.parent.postMessage({ type: "dom-stable" }, "*");
      }, 500);
      // Max timeout
      stableTimeout = setTimeout(function () {
        observer.disconnect();
        if (stableTimer) clearTimeout(stableTimer);
        window.parent.postMessage({ type: "dom-stable" }, "*");
      }, 5000);
    }

    if (type === "navigate") {
      var url = data.url;
      // If already at the right path, just confirm immediately
      if (window.location.pathname === url) {
        window.parent.postMessage({ type: "navigate-done", url: url }, "*");
      } else {
        window.location.href = url;
        var check = setInterval(function () {
          if (window.location.pathname === url) {
            clearInterval(check);
            window.parent.postMessage({ type: "navigate-done", url: url }, "*");
          }
        }, 100);
        setTimeout(function () { clearInterval(check); }, 5000);
      }
    }
  });
})();
