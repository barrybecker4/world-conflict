var domUtils = (function(my) {

    // Returns the element bearing the given ID.
    my.$ = function(id) {
        return document.querySelector('#' + id);
    }

    // Return HTML (string) for a new element with the given tag name, attributes, and inner HTML.
    // Some attributes can be shorthanded (see map).
    my.elem = function(tag, attrs, contents) {
        var shorthanded = {
            c: 'class',
            s: 'style',
            i: 'id',
            tt: 'title',
        };
        var html = '<' + tag + ' ';
        for (var attributeName in attrs) {
            html += (shorthanded[attributeName] || attributeName) + "='" + attrs[attributeName] + "' ";
        }
        html += '>' + (contents || '') + '</' + tag + '>';

        return html;
    }

    my.div = (attrs, contents) => my.elem('div', attrs, contents);

    // Appends new HTML to a container with the designated ID, and returns the resulting DOM node.
    my.append = function(containerId, newHTML) {
        var container = my.$(containerId);
        container.insertAdjacentHTML('beforeend', newHTML);
        return container.lastChild;
    }

    // Sets the 'transform' CSS property to a given value (also setting prefixed versions).
    my.setTransform = function(elem, value) {
        elem.style.transform = value;
        elem.style['-webkit-transform'] = value;
    }

    // Adds a handler that will be called when a DOM element is clicked or tapped (touch events).
    my.onClickOrTap = function(elem, fn) {
        elem.onclick = fn;
        elem.addEventListener('touchstart', function(event) {
            event.preventDefault();
            return fn(event);
        });
    }

    // Shows or hides an element with the given ID, depending on the second parameter.
    my.showOrHide = function(elementId, visible) {
        my.$(elementId).style.display = visible ? 'block' : 'none';
    }

    my.hide = function(elementId) { my.showOrHide(elementId, 0); }
    my.show = function(elementId) { my.showOrHide(elementId, 1); }

    my.toggleClass = function(element, className, on) {
        if (typeof element == 'string')
            element = my.$(element);
        element.classList[on ? 'add' : 'remove'](className);
    }

    return my;
} (domUtils || {}));

