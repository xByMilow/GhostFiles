document.addEventListener("DOMContentLoaded", () => {
    // Funktion zum Setzen des Custom-Cursors bei pointer
    function updateCursor(el) {
      el.addEventListener('mouseover', () => {
        const computedCursor = window.getComputedStyle(el).cursor;
        if (computedCursor === 'pointer') {
          el.style.cursor = "url('/assets/icons/cursor/pointer.ico'), auto";
        }
      });
  
      el.addEventListener('mouseout', () => {
        el.style.cursor = "";
      });
    }
  
    // Für alle bestehenden Elemente im DOM
    document.querySelectorAll('*').forEach(updateCursor);
  
    // MutationObserver für neu hinzugefügte Elemente
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Nur Elemente
            updateCursor(node);
            node.querySelectorAll && node.querySelectorAll('*').forEach(updateCursor);
          }
        });
      });
    });
  
    // Observer starten, sobald body vorhanden ist
    observer.observe(document.body, { childList: true, subtree: true });
  });