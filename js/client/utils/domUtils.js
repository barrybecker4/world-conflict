export default {
    div: (attrs, contents) => elem('div', attrs, contents),
    $, elem, append, setTransform,
    onClickOrTap,
    show, hide, toggleClass, showOrHide,
};

// Returns the element bearing the given ID.
function $(id) {
    return document.querySelector('#' + id);
}

// Return HTML (string) for a new element with the given tag name, attributes, and inner HTML.
// Some attributes can be shorthanded (see map).
function elem(tag, attrs, contents) {
    var shorthanded = {
        c: 'class',
        s: 'style',
        i: 'id'
    };
    var html = '<' + tag + ' ';
    for (var attributeName in attrs) {
        html += (shorthanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "' ";
    }
    html += '>' + (contents || '') + '</' + tag + '>';

    return html;
}

// Appends new HTML to a container with the designated ID, and returns the resulting DOM node.
function append(containerId, newHTML) {
    var container = $(containerId);
    container.insertAdjacentHTML('beforeend', newHTML);
    return container.lastChild;
}

// Sets the 'transform' CSS property to a given value (also setting prefixed versions).
function setTransform(elem, value) {
    elem.style.transform = value;
    elem.style['-webkit-transform'] = value;
}

// Adds a handler that will be called when a DOM element is clicked or tapped (touch events).
function onClickOrTap(elem, fn) {
    elem.onclick = fn;
    elem.addEventListener('touchstart', function(event) {
        event.preventDefault();
        return fn(event);
    });
}

// Shows or hides an element with the given ID, depending on the second parameter.
function showOrHide(elementId, visible) {
    $(elementId).style.display = visible ? 'block' : 'none';
}

function hide(elementId) { showOrHide(elementId, 0); }
function show(elementId) { showOrHide(elementId, 1); }

function toggleClass(element, className, on) {
    if (typeof element == 'string')
        element = $(element);
    element.classList[on ? 'add' : 'remove'](className);
}