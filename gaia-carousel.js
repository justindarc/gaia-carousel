;(function(define){'use strict';define(function(require,exports,module){
/*jshint esnext:true*/

/**
 * Constants
 */
var ACCELERATION_TIMEOUT = 250;
var ACCELERATION = 20;
var MINIMUM_SNAP_VELOCITY = 5;
var SNAP_ANIMATION_DURATION = 100;

/**
 * Locals
 */

// HACK: Create a <template> in memory at runtime.
// When the custom-element is created we clone
// this template and inject into the shadow-root.
// Prior to this we would have had to copy/paste
// the template into the <head> of every app that
// wanted to use <gaia-header>, this would make
// markup changes complicated, and could lead to
// things getting out of sync. This is a short-term
// hack until we can import entire custom-elements
// using HTML Imports (bug 877072).
var template = document.createElement('template');
template.innerHTML =
`<div class="gaia-carousel-container">
  <div class="gaia-carousel-item-container"></div>
  <div class="gaia-carousel-item-container"></div>
  <div class="gaia-carousel-item-container"></div>
</div>`;

/**
 *
 *
 * @private
 */
function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

/**
 *
 *
 * @private
 */
function toArray(list) {
  return Array.prototype.slice.call(list);
}

/**
 * Load in the the component's styles.
 *
 * We're working around a few platform bugs
 * here related to @import in the shadow-dom
 * stylesheet. When HTML-Imports are ready
 * we won't have to use @import anymore.
 *
 * The `-content` class is added to the element
 * as a simple 'polyfill' for `::content` selector.
 * We can use `.-content` in our CSS to indicate
 * we're styling 'distributed' nodes. This will
 * make the transition to `::content` a lot simpler.
 *
 * @private
 */
function styleHack(carousel) {
  carousel.style.visibility = 'hidden';

  var style = document.createElement('style');
  style.setAttribute('scoped', '');
  style.innerHTML =
`gaia-carousel {
  display: block;
}
.gaia-carousel-container {
  display: flex;
  flex-flow: row nowrap;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.gaia-carousel-container[data-direction="vertical"] {
  flex-flow: column nowrap;
}
.gaia-carousel-item-container {
  display: block;
  flex-shrink: 0;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  transform: translateZ(0);
}
.gaia-carousel-item-container > * {
  width: 100%;
  height: 100%;
}`;

  // There are platform issues around using
  // @import inside shadow root. Ensuring the
  // stylesheet has loaded before putting it in
  // the shadow root seems to work around this.
  style.addEventListener('load', function() {
    carousel.shadowRoot.appendChild(style.cloneNode(true));
    carousel.style.visibility = '';
    carousel.styled = true;
    carousel.dispatchEvent(new CustomEvent('styled'));
  });

  carousel.appendChild(style);
}

/**
 *
 *
 * @private
 */
function configureDirection(carousel) {
  var direction = carousel.getAttribute('direction') === 'vertical' ?
    'vertical' : 'horizontal';
  carousel.container.setAttribute('data-direction', direction);
  carousel.direction = direction;
}

/**
 *
 *
 * @private
 */
function configureItemCount(carousel) {
  var attribute = carousel.getAttribute('item-count') || '';
  var itemCount = parseInt(attribute, 10);
  if (itemCount + '' !== attribute.trim()) {
    return;
  }

  if (itemCount !== carousel.itemCount) {
    carousel.rendered = false;
  }

  carousel.itemCount = itemCount;
}

/**
 *
 *
 * @private
 */
function attachEventListeners(carousel) {
  var shadowRoot = carousel.shadowRoot;

  var lastOffset;
  var startAccelerateTimeStamp;
  var startAccelerateOffset;

  var onTouchStart = function(evt) {
    if (carousel.scrolling) {
      return;
    }

    var position = evt.type.indexOf('mouse') !== -1 ? evt : evt.touches[0];
    lastOffset = carousel.direction === 'horizontal' ? position.pageX : position.pageY;    
    startAccelerateTimeStamp = evt.timeStamp;
    startAccelerateOffset = carousel.scrollOffset;

    // Add event listeners
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('mousemove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mouseup', onTouchEnd);

    carousel.scrolling = true;

    evt.preventDefault();
  };

  var onTouchMove = function(evt) {
    if (!carousel.scrolling) {
      return;
    }

    var position = (evt.type.indexOf('mouse') !== -1) ? evt : evt.touches[0];
    var currentOffset = (carousel.direction === 'horizontal') ? position.pageX : position.pageY;
    var deltaOffset = lastOffset - currentOffset;

    carousel.scrollOffset += deltaOffset;

    window.requestAnimationFrame(function() {
      updateScrollOffset(carousel);
    });

    lastOffset = currentOffset;

    // Reset acceleration if sufficient time has passed since the last
    // `touchmove` event
    var accelerationTime = evt.timeStamp - startAccelerateTimeStamp;
    if (accelerationTime > ACCELERATION_TIMEOUT) {
      startAccelerateTimeStamp = evt.timeStamp;
      startAccelerateOffset = carousel.scrollOffset;
    }

    evt.preventDefault();
  };

  var onTouchEnd = function(evt) {
    if (!carousel.scrolling) {
      return;
    }

    // Remove event listeners
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('mousemove', onTouchMove);
    window.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('mouseup', onTouchEnd);

    // Round the scroll offset to determine which item index the
    // scrolling has landed on
    var scrollOffset = carousel.scrollOffset;
    var itemOffset = carousel.itemOffset;
    var relativeItemIndex = Math.round((scrollOffset - itemOffset) / itemOffset);

    // If the item index hasn't changed, but the scrolling velocity
    // has exceeded the threshold, automatically snap to the next/previous
    // item index ("flick" gesture)
    var acceleration = (startAccelerateTimeStamp - evt.timeStamp) / ACCELERATION;
    var velocity = (scrollOffset - startAccelerateOffset) / acceleration;

    if (relativeItemIndex === 0 && Math.abs(velocity) > MINIMUM_SNAP_VELOCITY) {
      relativeItemIndex = (velocity > 0) ? -1 : 1;
    }

    // Clamp the item index within the valid range
    var oldItemIndex = carousel.itemIndex;
    var newItemIndex = clamp(0, carousel.itemCount - 1, oldItemIndex + relativeItemIndex);

    carousel.scrolling = false;

    // Dispatch `change` event
    if (carousel.itemIndex !== newItemIndex) {

      // Update `itemIndex` and shift items in the DOM
      updateItemIndex(carousel, carousel.itemIndex, newItemIndex);

      carousel.dispatchEvent(new CustomEvent('changing', {
        detail: {
          oldItemIndex: oldItemIndex,
          newItemIndex: newItemIndex
        }
      }));

      snapScrollOffset(carousel, itemOffset, SNAP_ANIMATION_DURATION, function() {
        carousel.dispatchEvent(new CustomEvent('changed', {
          detail: {
            oldItemIndex: oldItemIndex,
            newItemIndex: newItemIndex
          }
        }));
      });
    }

    // Otherwise, just snap the scroll back into starting position
    else {
      snapScrollOffset(carousel, itemOffset, SNAP_ANIMATION_DURATION);
    }
  };

  // Attach event listeners
  shadowRoot.addEventListener('touchstart', onTouchStart);
  shadowRoot.addEventListener('mousedown', onTouchStart);
}

/**
 *
 *
 * @private
 */
function updateItemIndex(carousel, oldItemIndex, newItemIndex) {
  var container = carousel.container;
  var element;

  // Move last element to the start
  if (newItemIndex < oldItemIndex) {
    container.insertBefore(container.lastElementChild, container.firstElementChild);

    if (carousel.direction === 'horizontal') {
      carousel.scrollOffset += carousel.itemOffset;
    }

    else {
      carousel.scrollOffset += carousel.itemOffset;
    }

    renderItem(carousel, container.firstElementChild, newItemIndex - 1);
  }

  // Move first element to the end
  else if (newItemIndex > oldItemIndex) {
    container.appendChild(container.firstElementChild);

    if (carousel.direction === 'horizontal') {
      carousel.scrollOffset -= carousel.itemOffset;
    }

    else {
      carousel.scrollOffset -= carousel.itemOffset;
    }

    renderItem(carousel, container.lastElementChild, newItemIndex + 1);
  }

  carousel.itemIndex = newItemIndex;

  updateScrollOffset(carousel);
}

/**
 *
 *
 * @private
 */
function resetScrollOffset(carousel) {
  carousel.itemOffset = carousel.direction === 'horizontal' ?
    carousel.offsetWidth : carousel.offsetHeight;
  carousel.scrollOffset = carousel.itemOffset;

  updateScrollOffset(carousel);
}

/**
 *
 *
 * @private
 */
function updateScrollOffset(carousel) {
  if (carousel.direction === 'horizontal') {
    carousel.container.scrollLeft = carousel.scrollOffset;
  }

  else {
    carousel.container.scrollTop = carousel.scrollOffset;
  }
}

/**
 *
 *
 * @private
 */
function snapScrollOffset(carousel, targetOffset, duration, callback) {
  var startOffset = carousel.scrollOffset;
  var deltaOffset = targetOffset - startOffset;

  var startTime = Date.now();
  var lastTime = startTime;

  var tick = function() {

    // Stop animation if scrolling begins before animation completes
    if (carousel.scrolling) {
      return;
    }

    var time = Date.now();
    var deltaTime = (time - lastTime) / duration;

    if (time - startTime < duration) {
      lastTime = time;
      
      carousel.scrollOffset += deltaOffset * deltaTime;

      updateScrollOffset(carousel);

      window.requestAnimationFrame(tick);
    }

    else {
      carousel.scrollOffset = targetOffset;

      updateScrollOffset(carousel);

      if (typeof callback === 'function') {
        callback();
      }
    }
  };

  tick(startTime);
}

/**
 *
 *
 * @private
 */
function renderItem(carousel, itemContainer, itemIndex) {
  itemContainer.innerHTML = '';

  if (itemIndex < 0 || itemIndex >= carousel.itemCount) {
    return;
  }

  var item = carousel.items[itemIndex];
  if (item) {
    itemContainer.appendChild(item);
  }

  carousel.dispatchEvent(new CustomEvent('willrenderitem', {
    detail: {
      index: itemIndex,
      element: itemContainer
    }
  }));
}

/**
 *
 *
 * @private
 */
function renderItems(carousel) {
  if (carousel.itemCount === 0) {
    return;
  }

  var shadowRoot = carousel.shadowRoot;
  var itemContainers = carousel.container.children;

  for (var i = 0; i <= 2; i++) {
    renderItem(carousel, itemContainers[i], carousel.itemIndex + i - 1);
  }
}

/**
 * Element prototype, extends from HTMLElement
 *
 * @type {Object}
 */
var proto = Object.create(HTMLElement.prototype);

/**
 * Called when the element is first created.
 *
 * Here we create the shadow-root and
 * inject our template into it.
 *
 * @private
 */
proto.createdCallback = function() {
  var shadow = this.createShadowRoot();
  var tmpl = template.content.cloneNode(true);

  this.container = tmpl.querySelector('.gaia-carousel-container');

  // Automatically use child elements as items (if provided)
  this.items = toArray(this.children).filter(function(element) {
    var tagName = element.tagName;
    return tagName !== 'SCRIPT' && tagName !== 'STYLE';
  });

  if (this.items.length > 0) {
    this.setAttribute('item-count', this.items.length);
  }

  shadow.appendChild(tmpl);

  styleHack(this);
  configureDirection(this);
  configureItemCount(this);
  attachEventListeners(this);

  var self = this;
  setTimeout(function() {
    resetScrollOffset(self);
  }, 1);

  this.initialized = true;
};

/**
 * Called when one of the attributes
 * on the element changes.
 *
 * @private
 */
proto.attributeChangedCallback = function(attr, oldVal, newVal) {
  switch (attr) {
    case 'direction':
      configureDirection(this);
      break;
    case 'item-count':
      configureItemCount(this);
      break;
  }
};

// Flag indicating if scrolling is in-progress
proto.scrolling = false;

// Index of current item
proto.itemIndex = 0;

// Item width/height
proto.itemOffset = 0;

// Container scrollLeft/scrollTop
proto.scrollOffset = 0;

// Number of items
Object.defineProperty(proto, 'itemCount', {
  get: function() {
    return this._itemCount || 0;
  },

  set: function(value) {
    this._itemCount = value;
    this.setAttribute('item-count', this._itemCount);

    if (!this.container || this.rendered) {
      return;
    }

    var self = this;
    setTimeout(function() {
      renderItems(self);
    }, 1);

    this.rendered = true;
  }
});

var GaiaCarousel = document.registerElement('gaia-carousel', { prototype: proto });

GaiaCarousel.DIRECTION_HORIZONTAL = 'horizontal';
GaiaCarousel.DIRECTION_VERTICAL = 'vertical';

// Export the constructor and expose
// the `prototype` (Bug 1048339).
module.exports = GaiaCarousel;
module.exports._prototype = proto;

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-carousel',this));
