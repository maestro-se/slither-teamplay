var sosActive = false;
var foodAvailable = false;
var eatMeActive = false;
var lagActive = false;
var gameEndSent = false;

// Just for debug purpose
console.dir({
  plugin: "TeamPlay",
  status: "Active"
});

// When the page is ACTUALLY loaded in order to not interfere with actual webapge loading
(function(funcName, baseObj) {
  // The public function name defaults to window.docReady
  // but you can pass in your own object and own function name and those will be used
  // if you want to put them in a different namespace
  funcName = funcName || "docReady";
  baseObj = baseObj || window;
  var readyList = [];
  var readyFired = false;
  var readyEventHandlersInstalled = false;

  // call this when the document is ready
  // this function protects itself against being called more than once
  function ready() {
      if (!readyFired) {
          // this must be set to true before we start calling callbacks
          readyFired = true;
          for (var i = 0; i < readyList.length; i++) {
              // if a callback here happens to add new ready handlers,
              // the docReady() function will see that it already fired
              // and will schedule the callback to run right after
              // this event loop finishes so all handlers will still execute
              // in order and no new ones will be added to the readyList
              // while we are processing the list
              readyList[i].fn.call(window, readyList[i].ctx);
          }
          // allow any closures held by these functions to free
          readyList = [];
      }
  }

  function readyStateChange() {
      if ( document.readyState === "complete" ) {
          ready();
      }
  }

  // This is the one public interface
  // docReady(fn, context);
  // the context argument is optional - if present, it will be passed
  // as an argument to the callback
  baseObj[funcName] = function(callback, context) {
      if (typeof callback !== "function") {
          throw new TypeError("callback for docReady(fn) must be a function");
      }
      // if ready has already fired, then just schedule the callback
      // to fire asynchronously, but right away
      if (readyFired) {
          setTimeout(function() {callback(context);}, 1);
          return;
      } else {
          // add the function and context to the list
          readyList.push({fn: callback, ctx: context});
      }
      // if document already ready to go, schedule the ready function to run
      if (document.readyState === "complete") {
          setTimeout(ready, 1);
      } else if (!readyEventHandlersInstalled) {
          // otherwise if we don't have event handlers installed, install them
          if (document.addEventListener) {
              // first choice is DOMContentLoaded event
              document.addEventListener("DOMContentLoaded", ready, false);
              // backup is window load event
              window.addEventListener("load", ready, false);
          } else {
              // must be IE
              document.attachEvent("onreadystatechange", readyStateChange);
              window.attachEvent("onload", ready);
          }
          readyEventHandlersInstalled = true;
      }
  }
})("docReady", window);

// Override the socket connnection to get callbacks
function overrideSocketConnection() {
  if (window.ws === null || window.ws === undefined || window.eventAdded) {
    return;
  }

  try {
    window.kills = 0;
    window.ws.addEventListener("close", () => {
      if (gameEndSent) {
        return;
      }
      sendUpdate({ 
        type: "e", gameId: window.gameId, 
        nickname: "",
        locationX: 0,
        locationY: 0,
        serverIP: window.bso.ip,
        kills: window.kills,
        score: 10
      });
    });
    window.ws.addEventListener("message", function (b) {
      if (ws == this) {
        var c = new Uint8Array(b.data);
        if (2 <= c.length) {
          var f = String.fromCharCode(c[2]);
          if ("k" == f) { // Kill
            window.kills++;
          } else if ("v" == f) { // Died
            var snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
              window.fmlts[window.snake.sct] - 1) - 5);

            sendUpdate({ 
              type: "e", gameId: window.gameId, 
              nickname: getNickname(),
              locationX: window.snake.xx,
              locationY: window.snake.yy,
              serverIP: window.bso.ip,
              port: window.bso.po,
              kills: window.kills,
              score: snakeLength
            });
            start();
            gameEndSent = true;
            window.eventAdded = false;
          } else if ("a" == f) { // Spawned
            window.gameId = uuidv4();
            sendUpdate({ type: "s", gameId: window.gameId, serverIP: window.bso.ip, port: window.bso.po, grd: window.grd, locationX: 21500, locationY: 21500 });
            gameEndSent = false;
          } else if ("u" == f) { // send updates
            var snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
              window.fmlts[window.snake.sct] - 1) - 5);
            
            var packet = {
              nickname: getNickname(),
              locationX: window.snake.xx,
              locationY: window.snake.yy,
              sosActive: sosActive,
              score: snakeLength,
              foodAvailable: foodAvailable,
              eatMeActive: eatMeActive,
              lagActive: lagActive,
              serverIP: window.bso.ip,
              port: window.bso.po,
              gameId: window.gameId,
              kills: window.kills,
              type: "u"
            };
            sendUpdate(packet);
          }
        }
      }
    }, false)
    window.eventAdded = true;
  } catch (e) {
    console.error("While adding override event listener, caught ", e);
  }
}

// If your mod hides the actual nick you can get actual nick whereever your saving it and send it to backend.
function getNickname() {
  let nickname = window.snake.nk;
  if (nickname.indexOf("@") > -1 && window.snake.mynk !== null && window.snake.mynk !== undefined) {
    nickname = window.snake.mynk;
  }
  return nickname;
}

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0,
      v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Sends an update to backend
function sendUpdate(p) {
  window.postMessage(p, "*");
}


// use an anonymous function
docReady(function() {
  window.eventAdded = false;
});

var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(mutationRecord) {
  }); 
});

let _ws = null;
Object.defineProperty(this, 'ws', {
  get: function () { return _ws; },
  set: function (v) {
    console.log('Value changed! New value: ' + v);
    _ws = v;

    if (v !== null) {
      overrideSocketConnection();
    }
  }
});