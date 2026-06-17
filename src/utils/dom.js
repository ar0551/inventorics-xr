export function clearElement(element) {
  while (element.firstChild) {
    element.firstChild.remove();
  }
}

export function createElement(tag, options = {}) {
  const element = document.createElement(tag);

  if (options.className) element.className = options.className;
  if (options.text) element.textContent = options.text;
  if (options.html) element.innerHTML = options.html;
  if (options.type) element.type = options.type;

  return element;
}

export function getAppRoot() {
  return document.querySelector("#app");
}
