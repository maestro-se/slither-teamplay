// Just for debug purpose
console.dir({
  plugin: "TeamPlay",
  status: "Active"
});

// When the page is ACTUALLY loaded in order to not interfere with actual webapge loading
(function (funcName, baseObj) {
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
    if (document.readyState === "complete") {
      ready();
    }
  }

  // This is the one public interface
  // docReady(fn, context);
  // the context argument is optional - if present, it will be passed
  // as an argument to the callback
  baseObj[funcName] = function (callback, context) {
    if (typeof callback !== "function") {
      throw new TypeError("callback for docReady(fn) must be a function");
    }
    // if ready has already fired, then just schedule the callback
    // to fire asynchronously, but right away
    if (readyFired) {
      setTimeout(function () {
        callback(context);
      }, 1);
      return;
    } else {
      // add the function and context to the list
      readyList.push({
        fn: callback,
        ctx: context
      });
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

// use an anonymous function
docReady(function () {
  window.TeamPlay = new Main();
});
class Main {
  constructor() {
    this.login = document.getElementById("login");
    this.sosActive = false;
    this.foodAvailable = false;
    this.eatMeActive = false;
    this.lagActive = false;
    this.gameEndSent = false;
    this.gameStartSent = false;


    var observer = new MutationObserver((mutations) => {
      let mutation = mutations.pop()
      if (mutation.target.style.display === 'none') {
        this.overrideSocketConnection();
      }

    });

    // Options for the observer (which mutations to observe)
    const config = {
      attributes: true,
      childList: false,
      subtree: false
    };
    observer.observe(this.login, config);
  }

  // Override the socket connnection to get callbacks
  overrideSocketConnection() {
    if (window.ws === null || window.ws === undefined) {
      console.dir("Theres nothing to bind");
      return;
    }

    try {
      console.log("Binding...");
      this.kills = 0;
      window.ws.addEventListener("close", () => {
        if (this.gameEndSent) {
          return;
        }
        this.sendUpdate({
          type: "e",
          gameId: window.gameId,
          nickname: "",
          locationX: 0,
          locationY: 0,
          serverIP: window.bso.ip,
          kills: this.kills,
          score: 10
        });
      });

      window.ws.addEventListener("message", (b) => {
        var c = new Uint8Array(b.data);
        if (2 <= c.length) {
          var f = String.fromCharCode(c[2]);
          if ("k" == f) { // Kill
            this.kills++;
          } else if ("v" == f) { // Died
            var snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
              window.fmlts[window.snake.sct] - 1) - 5);

            this.sendUpdate({
              type: "e",
              gameId: this.gameId,
              nickname: this.getNickname(),
              locationX: window.snake.xx,
              locationY: window.snake.yy,
              serverIP: window.bso.ip,
              port: window.bso.po,
              kills: this.kills,
              score: snakeLength
            });
            this.gameEndSent = true;
          } else if ("a" == f) { // Spawned
            this.gameId = this.uuidv4();
            console.log("Spawned");
            this.sendUpdate({
              type: "s",
              gameId: this.gameId,
              serverIP: window.bso.ip,
              port: window.bso.po,
              grd: window.grd,
              locationX: 21500,
              locationY: 21500
            });
            this.gameEndSent = false;
            this.gameStartSent = true;
          } else if ("u" == f) { // send updates
            let packetType = "u";
            if (!this.gameStartSent) {
              this.gameId = this.uuidv4();
              packetType = "s";
              this.gameStartSent = true;
            }
            var snakeLength = Math.floor(15 * (window.fpsls[window.snake.sct] + window.snake.fam /
              window.fmlts[window.snake.sct] - 1) - 5);

            var packet = {
              nickname: this.getNickname(),
              locationX: window.snake.xx,
              locationY: window.snake.yy,
              sosActive: this.sosActive,
              score: snakeLength,
              foodAvailable: this.foodAvailable,
              eatMeActive: this.eatMeActive,
              lagActive: this.lagActive,
              serverIP: window.bso.ip,
              port: window.bso.po,
              gameId: this.gameId,
              kills: this.kills,
              type: "u"
            };
            this.sendUpdate(packet);
          }
        }
      }, false)
    } catch (e) {
      console.error("While adding override event listener, caught ", e);
    }
  }

  // If your mod hides the actual nick you can get actual nick whereever your saving it and send it to backend.
  getNickname() {
    let nickname = window.snake.nk;
    if (nickname.indexOf("@") > -1 && window.snake.mynk !== null && window.snake.mynk !== undefined) {
      nickname = window.snake.mynk;
    }
    return nickname;
  }

  uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Sends an update to backend
  sendUpdate(p) {
    window.postMessage(p, "*");
    if (p.type === 'e') {
      this.gameStartSent = false;
    }
  }
}