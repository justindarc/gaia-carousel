var items = ['red', 'blue', 'green', 'orange', 'yellow', 'magenta', 'cyan'];

var carousel = document.getElementById('external-carousel');
carousel.itemCount = items.length;
carousel.addEventListener('willrenderitem', function(evt) {
  var element = evt.detail.element;
  var item = items[evt.detail.index];
  element.innerHTML = '<div style="background-color: ' + item + ';">' + item + '</div>';
});
