var SQUARE_SIZE = 128;
var POLL_DELAY = 1000;

function maybeFixupYoutubeEmbed(iframe, size) {
  var fullSize = Math.floor(1.38 * size);
  var topTitleBar = Math.floor(0.18 * size);

  if (iframe.nodeName != "IFRAME")
    return;
  var src= $(iframe).attr("src");
  if (!src.match(/http:\/\/www\.youtube\.com/))
    return;
  if (src.indexOf('?') == -1)
    $(iframe).attr('src', src + "?controls=0");
  $(iframe).attr("width", null).attr("height", null);
  $(iframe).width(fullSize).height(fullSize).css({
    marginTop: -topTitleBar
  });
}

function maybeFixupImageDimensions(element, size) {
  if (element.nodeName == "IMG") {
    $(element).hide().load(function() {
      var width = $(this).width();
      var height = $(this).height();
      if (width > height) {
        $(this).height(size).width(null);
      } else {
        $(this).height(null).width(size);
      }
      $(this).show();
    });
  }
}

function buildQuilt(div) {
  var quilt = $('<div class="quilt"></div>');

  function addSquare(element) {
    var square = $('<div class="quilt-square"></div>');
    square.append(element).appendTo(quilt);
    square.data("hash", square.html());
  }

  div.contents().each(function() {
    switch (this.nodeType) {
      case this.TEXT_NODE:
      var trimmed = jQuery.trim(this.nodeValue);
      if (trimmed.length)
        addSquare($("<div></div>").text(trimmed));
      break;
      
      case this.ELEMENT_NODE:
      addSquare(this);
      break;
    }
  });

  return quilt;
}

function fixupQuilt(quilt, squareSize) {  
  var squaresPerSide = Math.floor(Math.sqrt(quilt.children().length));
  quilt.children().width(squareSize).height(squareSize);
  quilt.width(squareSize * squaresPerSide);

  quilt.children().each(function() {
    var element = this.firstChild;
    if (!$(element).data("fixed-up")) {
      maybeFixupYoutubeEmbed(element, squareSize);
      maybeFixupImageDimensions(element, squareSize);
      $(element).data("fixed-up", true);
    }
  });
  
  return quilt;
}

function applyQuiltChanges(oldQuilt, newQuilt) {
  var oldChildren = oldQuilt.children();
  var newChildren = newQuilt.children();
    
  oldChildren.each(function(i) {
    var oldSquare = $(this);
    var newSquare = $(newChildren[i]);
    if (newSquare.length == 0) {
      console.log("square", i, "removed");
      oldSquare.remove();
      return;
    }
    if (oldSquare.data("hash") != newSquare.data("hash")) {
      oldSquare.data("hash", newSquare.data("hash"));
      oldSquare.empty().append(newSquare.children());
      console.log("square", i, "changed");
    }
  });

  if (oldChildren.length < newChildren.length) {
    console.log(newChildren.length - oldChildren.length, "square(s) added");
    oldQuilt.append(newChildren.slice(oldChildren.length));
  }
}

function loadQuilt() {
  var div = $("<div></div>").appendTo(document.body).hide();
  div.load("quilt.html", function() {
    var quilt = buildQuilt(div);
    var oldQuilt = $(".quilt");
    if (oldQuilt.length) {
      applyQuiltChanges(oldQuilt, quilt);
      fixupQuilt(oldQuilt, SQUARE_SIZE);
    } else {
      fixupQuilt(quilt, SQUARE_SIZE);
      quilt.appendTo(document.body);
    }
    div.remove();
    setTimeout(loadQuilt, POLL_DELAY);
  });
}

$(window).ready(function() {
  loadQuilt();
});
