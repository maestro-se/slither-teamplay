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
      chrome.runtime.sendMessage(event.data);
      if (event.data.type === "s") {
        self.ground = event.data.grd;
        console.log("game started");
      } else if (event.data.type === "e") {
        this.clearInterval(self._updateTimer);
        removeFriendScore();
        console.log("game ended");
      } else if (event.data.type == "u") {
        chrome.runtime.sendMessage({type: 'f'}, function(response) {
          showFriends(response.friends);
        });
      }
    }
  }, false);
  window.addEventListener("load", myMain, false);

  function myMain(evt) {
    chrome.storage.local.get(null, function (output) {
      if (output["enabled"] == "true" || output["enabled"] == null || output["enabled"] == undefined) {
        let crateJS = document.createElement("SCRIPT");
        crateJS.src = chrome.extension.getURL("c.js");
        document.getElementsByTagName('head')[0].appendChild(crateJS);

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
          initializeUI();
        });

        window.localStorage.setItem("extensionId", chrome.runtime.id);
      }
    });
  }
}();

var mapDiv = null;

function removeFriendScore() {
  if (mapDiv == null) {
    var nsidivs = document.getElementsByClassName("nsi");
    for (var i = 0; i < nsidivs.length; i++) {
      if (nsidivs[i].style.zIndex == 10) {
        mapDiv = nsidivs[i];
        break;
      }
    }
  }

  if (mapDiv != null) {
    var descendents = mapDiv.getElementsByTagName('div');
    for (i = 0; i < descendents.length; ++i) {
      var e = descendents[i];
      if (e.hasAttribute("id")) {
        mapDiv.removeChild(e);
      }
    }
  }

  var friendsLeaderboard = document.getElementById('friendsLeaderboard');
  friendsLeaderboard.innerHTML = "";

}

function updateScore(friend) {
  var friendsLeaderboard = document.getElementById('friendsLeaderboard');
  var _scoreNameDiv = document.getElementById("score_name_" + friend.nickname);
  var _scoreDiv = document.getElementById("score_" + friend.nickname);

  if (_scoreDiv == null) {
    _scoreDiv = document.createElement("div");
    _scoreDiv.className = "scoreDiv";
    _scoreDiv.id = "score_" + friend.nickname;
    friendsLeaderboard.appendChild(_scoreDiv);
  }
  var cssName = "scoreNameDiv";
  var additions = "";
  if (friend.isBotEnabled) {
    additions = additions + "BOT ";
    cssName = "scorenameDivBot";
  }

  if (friend.eatMeActive) {
    additions = additions + "EATME ";
    cssName = "scoreNameDivEATME";
  }

  if (friend.foodAvailable) {
    additions = additions + "FOOD ";
    cssName = "scoreNameDivFood";
  }

  if (friend.sosActive) {
    additions = additions + "SOS ";
    cssName = "scoreNameDivSOS";
  }

  if (friend.lagActive) {
    additions = additions + "LAG :/ ";
    cssName = "scoreNameDivLAG";
  }

  var showFriendsIP = true;
  if (showFriendsIP === undefined || showFriendsIP === null || showFriendsIP === "No") {
    //do nothing
  } else {
    additions = additions + "<br />" + friend.serverIP;
  }

  if (_scoreNameDiv == null) {
    _scoreNameDiv = document.createElement("div");
    _scoreNameDiv.className = cssName;
    _scoreNameDiv.id = "score_name_" + friend.nickname;
    friendsLeaderboard.appendChild(_scoreNameDiv);
  }

  var dotDiv = "<div style='float:left;margin:2px;border-radius: 50%;width: 10px;height: 10px;background:" + friend.dotColor + ";border:black;'></div>";

  _scoreDiv.innerHTML = friend.score;
  _scoreNameDiv.innerHTML = dotDiv + "<div>" + friend.nickname + ": " + additions + "</div>";
}

function updateMap(friend) {

  if (mapDiv == null) {
    var nsidivs = document.getElementsByClassName("nsi");
    for (var i = 0; i < nsidivs.length; i++) {
      if (nsidivs[i].style.zIndex == 10) {
        mapDiv = nsidivs[i];
        break;
      }
    }
  }

  if (mapDiv !== null) {

    var img = document.getElementById(friend.nickname);
    if (img == null) {
      img = document.createElement("div");
      mapDiv.appendChild(img);
    }

    var dotHeight = 14;

    img.style.position = "absolute";
    img.style.left = Math.round(52 + 40 * (friend.locationX - self.ground) / self.ground - (dotHeight / 2)) + "px";
    img.style.top = Math.round(52 + 40 * (friend.locationY - self.ground) / self.ground - (dotHeight / 2)) + "px";
    // img.style.left = Math.round(52 * Y.nA + 40 * Y.nA * (snake.xx - self.ground) / self.ground - 7) + "px";
    // img.style.top = Math.round(52 * Y.nA + 40 * Y.nA * (snake.yy - self.ground) / self.ground - 7) + "px";
    img.style.opacity = 1;
    img.style.zIndex = 13;
    img.style.borderRadius = "50%";
    img.style.background = friend.dotColor;
    img.style.height = dotHeight + "px";
    img.style.width = dotHeight + "px";
    img.id = friend.nickname;
    img.className = "dot";

    if (friend.sosActive) {
      img.style.background = "#ff0000";
    }

  }
}

function initializeUI() {
  var divFriendsLeaderboard = document.createElement("div");
  divFriendsLeaderboard.id = "friendsLeaderboard";
  divFriendsLeaderboard.className = "friendsLeaderboard";

  document.body.appendChild(divFriendsLeaderboard);
}

function showFriends(friends) {
  if (window.onFriends) {
    window.onFriends(friends);
  } else {
    removeFriendScore();
    for (friend of friends) {
      updateScore(friend);
      updateMap(friend);
    }
  }
}