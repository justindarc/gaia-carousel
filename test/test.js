/*global window,assert,suite,setup,teardown,sinon,test*/
/*jshint esnext:true*/

suite('GaiaCarousel', function() {
  'use strict';

  var GaiaCarousel = window['gaia-carousel'];

  function triggerTouchEvent(element, type, x, y, identifier) {
    var touch = document.createTouch(window, element,
                                     identifier || 0,
                                     x || 0,
                                     y || 0);
    var touchList = document.createTouchList([touch]);
    var touchEvent = document.createEvent('TouchEvent');
    touchEvent.initTouchEvent(type,       // type
                              true,       // bubbles
                              true,       // cancelable
                              window,     // view
                              null,       // detail
                              false,      // ctrlKey
                              false,      // altKey
                              false,      // shiftKey
                              false,      // metaKey
                              touchList,  // touches
                              touchList,  // targetTouches
                              touchList); // changedTouches
    element.dispatchEvent(touchEvent);
  }

  setup(function() {
    this.sandbox = sinon.sandbox.create();
    this.container = document.createElement('div');
    this.sandbox.spy(HTMLElement.prototype, 'addEventListener');
    this.sandbox.spy(window, 'addEventListener');
  });

  teardown(function() {
    this.sandbox.restore();
  });

  test('It should listen for "resze" event on `window`', function() {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    assert.ok(window.addEventListener.calledWith('resize'));
  });

  test('It should set `itemCount` to `0` (inline)', function() {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.isTrue(element.itemCount === 0);
  });

  test('It should set `itemCount` to `1` (inline)', function() {
    this.container.innerHTML =
      '<gaia-carousel>' +
        '<div></div>' +
      '</gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.isTrue(element.itemCount === 1);
  });

  test('It should set `direction` to default `DIRECTION_HORIZONTAL`', function() {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.isTrue(element.direction === GaiaCarousel.DIRECTION_HORIZONTAL);
  });

  test('It should set `direction` to default `DIRECTION_VERTICAL`', function() {
    this.container.innerHTML = '<gaia-carousel direction="vertical"></gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.isTrue(element.direction === GaiaCarousel.DIRECTION_VERTICAL);
  });

  test('It should add a Shadow DOM stylesheet to the root of the element', function() {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.ok(element.querySelector('style[scoped]'));
  });

  test('It should set `scrolling` flag on "touchstart"/"touchend" events', function() {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    assert.isFalse(element.scrolling);

    triggerTouchEvent(element.shadowRoot, 'touchstart');
    assert.isTrue(element.scrolling);

    triggerTouchEvent(window, 'touchend');
    assert.isFalse(element.scrolling);
  });

  test('It should dispatch "willrenderitem" event once for `itemCount` == 1', function(done) {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    element.itemCount = 1;
    element.addEventListener('willrenderitem', function firstItem(evt) {
      element.removeEventListener('willrenderitem', firstItem);

      assert.equal(evt.detail.index, 0);
      done();
    });
  });

  test('It should dispatch "willrenderitem" event twice for `itemCount` >= 2', function(done) {
    this.container.innerHTML = '<gaia-carousel></gaia-carousel>';
    var element = this.container.firstElementChild;
    element.itemCount = 2;
    element.addEventListener('willrenderitem', function firstItem(evt) {
      element.removeEventListener('willrenderitem', firstItem);

      assert.equal(evt.detail.index, 0);

      element.addEventListener('willrenderitem', function secondItem(evt) {
        element.removeEventListener('willrenderitem', secondItem);

        assert.equal(evt.detail.index, 1);
        done();
      });
    });
  });

  test('It should dispatch a "changing" event on horizontal flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel>' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';

    var element = this.container.firstElementChild;
    element.addEventListener('changing', function onChanging(evt) {
      element.removeEventListener('changing', onChanging);
      assert.ok(evt);
      done();
    });

    // Flick left (x: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 200, 0);
    triggerTouchEvent(window, 'touchmove', 100, 0);
    triggerTouchEvent(window, 'touchend');
  });

  test('It should dispatch a "changing" event on vertical flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel direction="vertical">' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';

    var element = this.container.firstElementChild;
    element.addEventListener('changing', function onChanging(evt) {
      element.removeEventListener('changing', onChanging);
      assert.ok(evt);
      done();
    });

    // Flick left (y: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 0, 200);
    triggerTouchEvent(window, 'touchmove', 0, 100);
    triggerTouchEvent(window, 'touchend');
  });

  test('It should dispatch a "changed" event on horizontal flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel>' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';

    var element = this.container.firstElementChild;
    element.addEventListener('changed', function onChanged(evt) {
      element.removeEventListener('changed', onChanged);
      assert.ok(evt);
      done();
    });

    // Flick left (x: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 200, 0);
    triggerTouchEvent(window, 'touchmove', 100, 0);
    triggerTouchEvent(window, 'touchend');
  });

  test('It should dispatch a "changed" event on vertical flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel direction="vertical">' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';

    var element = this.container.firstElementChild;
    element.addEventListener('changed', function onChanged(evt) {
      element.removeEventListener('changed', onChanged);
      assert.ok(evt);
      done();
    });

    // Flick left (y: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 0, 200);
    triggerTouchEvent(window, 'touchmove', 0, 100);
    triggerTouchEvent(window, 'touchend');
  });

  test('It should increment/decrement `itemIndex` value on horizontal flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel>' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';
    var element = this.container.firstElementChild;
    assert.equal(element.itemIndex, 0);

    // Flick left (x: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 200, 0);
    triggerTouchEvent(window, 'touchmove', 100, 0);
    triggerTouchEvent(window, 'touchend');
    assert.equal(element.itemIndex, 1);
    
    element.addEventListener('changed', function onChanged() {
      element.removeEventListener('changed', onChanged);

      // Flick right (x: 100 -> 200)
      triggerTouchEvent(element.shadowRoot, 'touchstart', 100, 0);
      triggerTouchEvent(window, 'touchmove', 200, 0);
      triggerTouchEvent(window, 'touchend');
      assert.equal(element.itemIndex, 0);
      done();
    });
  });

  test('It should increment/decrement `itemIndex` value on vertical flick gesture', function(done) {
    this.container.innerHTML =
      '<gaia-carousel direction="vertical">' +
        '<div></div>' +
        '<div></div>' +
      '</gaia-carousel>' +
      '<style>' +
        'gaia-carousel {' +
          'width: 300px;' +
          'height: 150px;' +
        '}' +
      '</style>';
    var element = this.container.firstElementChild;
    assert.equal(element.itemIndex, 0);

    // Flick left (y: 200 -> 100)
    triggerTouchEvent(element.shadowRoot, 'touchstart', 0, 200);
    triggerTouchEvent(window, 'touchmove', 0, 100);
    triggerTouchEvent(window, 'touchend');
    assert.equal(element.itemIndex, 1);
    
    element.addEventListener('changed', function onChanged() {
      element.removeEventListener('changed', onChanged);

      // Flick right (y: 100 -> 200)
      triggerTouchEvent(element.shadowRoot, 'touchstart', 0, 100);
      triggerTouchEvent(window, 'touchmove', 0, 200);
      triggerTouchEvent(window, 'touchend');
      assert.equal(element.itemIndex, 0);
      done();
    });
  });

});
