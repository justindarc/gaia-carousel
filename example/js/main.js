/**
 * <gaia-carousel id="external-carousel"></gaia-carousel>
 */
var external = document.getElementById('external-carousel');
var items = ['red', 'blue', 'green', 'orange', 'yellow', 'magenta', 'cyan'];
external.itemCount = items.length;
external.addEventListener('willrenderitem', function(evt) {
  var element = evt.detail.element;
  var item = items[evt.detail.index];
  element.innerHTML = '<div style="background-color: ' + item + ';">' + item + '</div>';
});

/**
 * <gaia-carousel id="media-carousel"></gaia-carousel>
 */
var media = document.getElementById('media-carousel');
var photos = [
  'img/image_01.jpg',
  'img/image_02.jpg',
  'img/image_03.jpg',
  'img/image_04.jpg',
  'img/image_05.jpg'
];
media.itemCount = photos.length;
media.addEventListener('willrenderitem', function(evt) {
  var element = evt.detail.element;
  var photo = photos[evt.detail.index];

  var frame = element.frame;
  if (!frame) {
    frame = element.frame = document.createElement('div');
    frame.dir = 'ltr';
    frame.addEventListener('touchstart', function(evt) {
      media.disabled = media.disabled || evt.touches.length > 1;
    });
  }

  element.appendChild(frame);

  var mediaFrame = frame.mediaFrame;
  if (!mediaFrame) {
    mediaFrame = frame.mediaFrame = new MediaFrame(frame, true);
    addPanAndZoomHandlers(mediaFrame, function(overpan) {
      media.disabled = !overpan;
    });
  }

  var img = new Image();
  img.onload = function() {
    var canvas = document.createElement('canvas');
    var width  = canvas.width  = img.width;
    var height = canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    canvas.toBlob(function(blob) {
      mediaFrame.displayImage(blob, width, height);
    }, 'image/jpeg');
  };
  img.src = photo;
});
media.addEventListener('willresetitem', function(evt) {
  var element = evt.detail.element;
  var mediaFrame = element.frame && element.frame.mediaFrame;
  if (mediaFrame) {
    mediaFrame.reset();
  }
});
