! function () {
  
  window.addEventListener("message", function (event) {
    // console.log("Inject Incoming", event.data);
    // We only accept messages from ourselves
    if (event.source != window)
      return;

    if (event.data.type && (event.data.type !== undefined)) {
      // if (!connected) {
      //   connectBackground();
      // }
      // console.dir(event.data);

      if (event.data.grd) {
        self.ground = event.data.grd;
      }

      chrome.runtime.sendMessage(event.data);
      if (event.data.type === "s") {
        self.ground = event.data.grd;
        console.log("game started");
      } else if (event.data.type === "e") {
        console.log("game ended");
      } else if (event.data.type == "u") {
        chrome.runtime.sendMessage({type: 'f'}, function(response) {
          window.postMessage({ friends : response.friends }, "*");
        });
      }
    }
  }, false);
  window.addEventListener("load", myMain, false);

  function myMain(evt) {
    chrome.storage.local.get(null, function (output) {
      if (output["enabled"] == "true" || output["enabled"] == null || output["enabled"] == undefined) {
        

        var mainScript = document.createElement("SCRIPT");
        mainScript.src = chrome.extension.getURL("main.js");
        document.getElementsByTagName('head')[0].appendChild(mainScript);
        // Add CSS
        var css = document.createElement("LINK");
        css.href = chrome.extension.getURL("bootstrap.css");
        css.rel = 'stylesheet';
        css.type = 'text/css';
        css.media = 'screen';
        document.getElementsByTagName('head')[0].appendChild(css);

        mainScript.addEventListener("load", function () {
          chrome.runtime.sendMessage({
            type: "refresh"
          });
        });

        window.localStorage.setItem("extensionId", chrome.runtime.id);
      }
    });
  }
}();
