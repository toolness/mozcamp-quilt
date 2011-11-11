var SQUARE_SIZE = 128;
var POLL_DELAY = 10000;
var ETHERPAD_GATEWAY = "http://etherpad-export.appspot.com/";

function maybeFixupImageDimensions(element, size) {
  function fixup() {
    var width = this.naturalWidth;
    var height = this.naturalHeight;
    if (width > height) {
      $(this).height(size).width(null);
    } else {
      $(this).height(null).width(size);
    }
  }
  
  if (element.nodeName == "IMG") {
    if (element.complete)
      fixup.call(element);
    else {
      $(element).hide().load(function() {
        fixup.call(this);
        $(this).show();
      });
    }
  }
}

function maybeFixupSection(element, size) {
  if (element.nodeName == "SECTION") {
    var img = $(element).find("> img");
    if (img.length)
      maybeFixupImageDimensions(img[0], size);
    var isFocused = false;
    $(element).find("> img, > h1").click(function() {
      isFocused = !isFocused;
      var action = isFocused ? 'addClass' : 'removeClass';
      $("div.quilt").children().each(function() {
        if (this != $(element).parent()[0]) {
          $(this)[action]("blurred");
        }
      });
      $(element).parent()[action]("focused");
      var offset = $(element).parent().offset();
      if (isFocused) {
        var transform = 'translate(-' + offset.left + 'px, -' +
                        offset.top + 'px) scale(4)';
        $(element).parent().css({
          '-moz-transform': transform,
          '-webkit-transform': transform
        });
      } else
        $(element).parent().css({
          '-moz-transform': 'none',
          '-webkit-transform': 'none'
        });
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
  //var squaresPerSide = Math.floor(Math.sqrt(quilt.children().length));
  var squaresPerSide = 5;
  quilt.children().width(squareSize).height(squareSize);
  quilt.width(squareSize * squaresPerSide);

  quilt.children().each(function() {
    var element = this.firstChild;
    if (!$(element).data("fixed-up")) {
      maybeFixupSection(element, squareSize);
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

function removeDuplicateEntries(div) {
  var titles = {};
  
  div.find("section > h1").each(function() {
    var title = $(this).text().toLowerCase();
    if (title in titles)
      $(this).closest("section").remove();
    else
      titles[title] = true;
  });
}

function createQuilt(div) {
  removeDuplicateEntries(div);
  
  var quilt = buildQuilt(div);
  var oldQuilt = $(".quilt");
  if (oldQuilt.length) {
    applyQuiltChanges(oldQuilt, quilt);
    fixupQuilt(oldQuilt, SQUARE_SIZE);
  } else {
    fixupQuilt(quilt, SQUARE_SIZE);
    quilt.appendTo(document.body);
  }
}

function loadQuiltFromEtherpad(hostname, port, pad) {
  var lastLoad = new Date();
  var gateway = ETHERPAD_GATEWAY;
  var params = {
    server: hostname,
    port: port,
    pad: pad,
    format: "txt"
  };

  if (params.port == "0" || params.port == "")
    params.port = "80";

  setInterval(function() {
    $(".last-load").text($.timeago(lastLoad));
  }, 1000);

  function load() {
    var div = $("<div></div>").appendTo(document.body).hide();
    jQuery.ajax({
      type: 'GET',
      crossDomain: true,
      url: gateway,
      data: params,
      dataType: "text",
      error: function(jqXHR, textStatus, errorThrown) {
        var msg = "Fetching the pad failed.";

        if (jqXHR.status == 404) {
          msg = "No pad exists at that url.";
        }

        console.log('error', msg);
      },
      success: function(data) {
        div.html(data);
        createQuilt(div);
        lastLoad = new Date();
      },
      complete: function() {
        div.remove();
        setTimeout(load, POLL_DELAY);
      },
      timeout: 10000        
    });    
  }
  
  load();
}

function startKioskMode() {
  var i = 0;
  var lastSquare = null;

  function focusNextSquare() {
    var squares = $(".quilt-square");
    if (squares.length == 0) {
      setTimeout(focusNextSquare, 1000);
      return;
    }
    if (squares.length <= i)
      i = 0;
    $(squares[i]).find("> section > h1").click();
    lastSquare = squares[i];
    i++;
    setTimeout(unfocusCurrentSquare, 5000);
  }
  
  function unfocusCurrentSquare() {
    if (lastSquare)
      $(lastSquare).find("> section > h1").click();
    lastSquare = null;
    setTimeout(focusNextSquare, 2000);
  }
  
  setTimeout(focusNextSquare, 1000);
}

$(window).ready(function() {
  var embeddedQuilt = $('#embedded-quilt');
  if (embeddedQuilt.length != 0) {
    $("#status-bar").hide();
    createQuilt(embeddedQuilt);
  }
  if (window.location.search.match(/devmode=1/)) {
    ETHERPAD_GATEWAY = "sample-etherpad-content.html";
    POLL_DELAY = 1000;
  }
  if (window.location.search.match(/kiosk=1/)) {
    $("#status-bar").hide();
    startKioskMode();
  }
  if (embeddedQuilt.length == 0)
    loadQuiltFromEtherpad("etherpad.mozilla.com", "9000", "test-quilt");
});
