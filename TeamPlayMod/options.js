const BASE_URL = "https://slitherfriends.herokuapp.com";
var createCORSRequest = function (method, url) {
  var xhr = new XMLHttpRequest();
  if ("withCredentials" in xhr) {
    // Most browsers.
    xhr.open(method, url, true);
  } else if (typeof XDomainRequest != "undefined") {
    // IE8 & IE9
    xhr = new XDomainRequest();
    xhr.open(method, url);
  } else {
    // CORS not supported.
    xhr = null;
  }

  return xhr;
};

(function () {
  mdc.ripple.MDCRipple.attachTo(document.querySelector('.mdc-button'));
  mdc.textField.MDCTextField.attachTo(document.querySelector('.mdc-text-field'))
  mdc.topAppBar.MDCTopAppBar.attachTo(document.querySelector('.mdc-top-app-bar'));
  window.dialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('.mdc-dialog'));
  window.deleteDialog = mdc.dialog.MDCDialog.attachTo(document.querySelector('.confirmation'));
  window.progress = mdc.linearProgress.MDCLinearProgress.attachTo(document.querySelector('.mdc-linear-progress'));
  window.snack = mdc.snackbar.MDCSnackbar.attachTo(document.querySelector(".mdc-snackbar"));
  
  // Hide progress bar
  window.progress.close();
  
  // Add Auth Dialog Events
  window.dialog.listen('MDCDialog:closed', (action) => {
    console.dir(action);
    if (action.detail.action == "yes") {
      validateAuthKey(document.getElementById("text-field-hero-input").value);
    }
  });

  // Delete confirmation dialog events
  window.deleteDialog.listen('MDCDialog:closed', (action) => {
    console.dir(action);
    if (action.detail.action == "yes") {
      console.dir("Deleting key: " + window.current);
      chrome.storage.sync.get('keys', (settings) => {
        console.dir(settings);
        if (settings.keys !== undefined) {
          for (var i = 0; i < settings.keys.length; i++) {
            let k = settings.keys[i];
            if (k.authKey == window.current) {
              window.current == null;
              settings.keys.splice(i, 1);
              break;
            }
          }
          // Save new array
          chrome.storage.sync.set({keys: settings.keys}, () => { });
          chrome.runtime.sendMessage({type: "refresh"});
          window.location.reload();
        }
      });
    }
  });

  // Add auth key button event
  let addButton = document.getElementById("addButton");
  addButton.onclick = () => {
    showAddAuthKey();
  };

  // get saved auth keys
  chrome.storage.sync.get('keys', (settings) => {
    if (settings.keys !== undefined) {
      bindKeyTable(settings.keys);
    }
  });

})();

// Shows the add authkey dialog
function showAddAuthKey(element) {
  document.getElementById("authKeyError").style.display = 'none';
  document.getElementById("text-field-hero-input").value = "";
  window.dialog.open();
}

// called when user taps on Add button on dialog
function validateAuthKey(authKey) {
  doValidateAuthKey(authKey);
}

// validates an auth key, and sets the default nickname
function doValidateAuthKey(authKey, shouldSetNickname) {
  window.progress.open();
  var packet = {
    authKey: authKey
  };
  var method = 'POST';
  var xhr = createCORSRequest(method, BASE_URL + "/validateAuthKey");
  xhr.setRequestHeader("content-type", "application/json");
  xhr.addEventListener("readystatechange", function () {
    if (this.readyState === 4) {
      window.progress.close();
      var response = JSON.parse(this.responseText);
      if (response.success === true) {
        chrome.storage.sync.get('keys', (settings) => {
          var keys = [];
          if (settings.keys !== undefined) {
            keys = settings.keys;
          }
          var me = response.member;
          me.team = response.team;
          me.enabled = true;

          keys.push(me);

          // Save new array
          chrome.storage.sync.set({keys: keys}, () => { });
          chrome.runtime.sendMessage({type: "refresh"});
        });

        if (response.team.leader === response.member.nickname) {}
        
        showSnack("Auth key saved");
        window.location.reload();
      } else {
        document.getElementById("authKeyError").style.display = 'block';
        window.dialog.open();
      }
    }
  });

  xhr.send(JSON.stringify(packet));
}
// show snack with message
function showSnack(message) {
  let snackText = document.getElementById("snack");
  snackText.innerHTML = message;
  window.snack.open();
}

// shows table
function bindKeyTable(keys) {
  let collection = document.getElementById("authKeysCollection");
  for (key of keys) {
    let tr = getTR();
    let tdDot = getDot(key.color);
    let tdKey = getTD(key.authKey);
    let tdName = getTD(key.nickname);
    let tdTeamName = getTD(key.team.name);
    tr.appendChild(tdDot);
    tr.appendChild(tdKey);
    tr.appendChild(tdName);
    tr.appendChild(tdTeamName);
    let tdAction = getTD('<button id="key_'+key.authKey+'" class="mdc-button"><i class="material-icons mdc-button__icon">remove_circle_outline</i></button>');
    tr.appendChild(tdAction);
    let tdOnOff = getTD('<div class="mdc-switch" id="switch_'+key.authKey+'"><div class="mdc-switch__track"></div><div class="mdc-switch__thumb-underlay"><div class="mdc-switch__thumb"><input type="checkbox" id="checkbox_'+key.authKey+'" class="mdc-switch__native-control" role="switch"></div></div></div>');
    tr.appendChild(tdOnOff);
    collection.appendChild(tr);
    
    let checkbox = (document.getElementById('checkbox_'+key.authKey));
    checkbox.onclick = (element) => {
      console.dir(element);
      for(var i = 0;i < element.path.length; i++) {
        let id = element.path[i].getAttribute("id");
        if (id !== null && id.indexOf("checkbox_") > -1) {
          let auth = id.replace("checkbox_", "");
          toggleLocation(auth);
          break;
        }
      }
    };
    let deleteAction = document.getElementById("key_" + key.authKey);
    deleteAction.onclick = (element) => {
      console.dir(element);
      for(var i = 0;i < element.path.length; i++) {
        let id = element.path[i].getAttribute("id");
        if (id !== null && id.indexOf("key_") > -1) {
          let auth = id.replace("key_", "");
          window.current = auth;
          window.deleteDialog.open();
          break;
        }
      }
    }
    let control = mdc.switchControl.MDCSwitch.attachTo(document.getElementById('switch_'+key.authKey));
    control.checked = key.enabled;
  } // end loop
}

function getTR() {
  let tr = document.createElement("tr");
  tr.setAttribute("class", "mdc-data-table__row");
  return tr;
}

function getTD(text) {
  let td = document.createElement("td");
  td.setAttribute("class", "mdc-data-table__cell");
  td.innerHTML = (text);
  return td;
}

function getDot(color) {
  let dot = '<div class="circle" style="background-color: '+color+';"></div>';
  return getTD(dot);
}

function toggleLocation(auth) {
  chrome.storage.sync.get('keys', (settings) => {
    console.dir(settings);
    if (settings.keys !== undefined) {
      for (var i = 0; i < settings.keys.length; i++) {
        let k = settings.keys[i];
        if (k.authKey == auth) {
          settings.keys[i].enabled = !settings.keys[i].enabled;
          break;
        }
      }
      console.dir(settings.keys);
      // Save new array
      chrome.storage.sync.set({keys: settings.keys}, () => { });
      chrome.runtime.sendMessage({type: "refresh"});
    }
  });
}