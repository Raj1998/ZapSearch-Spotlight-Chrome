var bookmarks_map = {};

class BackgroundManager {
  /**
   * Processing bookmarks in a dictionary
   * to be consumed in the content script
   * @param bookmarks
   */
  process_bookmark = async (bookmarks) => {
    for (var i = 0; i < bookmarks.length; i++) {
      var bookmark = bookmarks[i];

      if (bookmark.url) {
        let favicon = await this.fetchFavicon(bookmark.url);
        bookmarks_map[bookmark.title] = {
          favicon: favicon,
          url: bookmark.url,
        };
      }

      if (bookmark.children) {
        this.process_bookmark(bookmark.children);
      }
    }
  };


  /**
   * Fetching all the favicons for the
   * bookmarks' url from chrome://favicon
   * @param url
   */
  fetchFavicon = (url) => {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = (this as any).width;
        canvas.height = (this as any).height;

        var ctx = canvas.getContext('2d');
        ctx.drawImage(this as any, 0, 0);

        var dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      };
      img.src = 'chrome://favicon/' + url;
    });
  };

  
  /**
   * Fetching bookmarks by getTree API
   */
  fetchBookmarks() {
    chrome.bookmarks.getTree(this.process_bookmark);
  }

  /**
   * Adding the listener for launching the
   * Zap-search bar
   * Ex. Command+Shift+P listener
   * When triggered checking for new tab,
   * because it cannot be launched on new tab
   */
  setLaunchListener() {
    chrome.commands.onCommand.addListener(function (command) {
      if (command === 'launch-spotlight') {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          function (tabs) {
            if (tabs[0].url == 'chrome://newtab/') {
              chrome.tabs.create({
                url: 'spotlight-chrome.html',
              });
            } else {
              if (!tabs[0].url.startsWith('chrome-extension:')) {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { data: bookmarks_map },
                  function (resp) {}
                );
              }
            }
          }
        );
      }
    });
  }

  /**
   * Utility event listeners for functionality
   * of the extension
   */
  setUtilityListeners() {
    chrome.runtime.onMessage.addListener(function (
      request,
      sender,
      sendResponse
    ) {
      if (request.action == 'duplicate') {
        chrome.tabs.getSelected(null, (tab) => {
          chrome.tabs.duplicate(tab.id);
        });
        sendResponse('OK');
      } else if (request.action == 'move-end') {
        chrome.tabs.getSelected(null, (tab) => {
          chrome.tabs.move(tab.id, { index: -1 });
        });
        sendResponse('OK');
      } else if (request.action == 'move-start') {
        chrome.tabs.getSelected(null, (tab) => {
          chrome.tabs.move(tab.id, { index: 0 });
        });
        sendResponse('OK');
      } else if (request.action == 'do-eval') {
        // eval(request.js.code);
        sendResponse('OK');
      } else if (request.action == 'settings') {
        chrome.tabs.create({
          url: 'chrome://settings',
        });
        sendResponse('OK');
      } else if (request.action == 'shortcuts') {
        chrome.tabs.create({
          url: 'chrome://extensions/shortcuts',
        });
        sendResponse('OK');
      }
    });
  }
}

const bgManager = new BackgroundManager();
bgManager.fetchBookmarks();
bgManager.setLaunchListener();
bgManager.setUtilityListeners();
