/**
 * Variable for stroing bookmarks as
 * key value pairs
 */
var bookmarks_map = {};
var ranks = {}

/**
 * Class for managing background actions 
 * Unlike Content script, 
 * this methods run in the context of 
 * whole chrome browser, not for a single 
 * webpage.
 */
class BackgroundManager {
  /**
   * Processing bookmarks in a dictionary
   * to be consumed in the content script
   * @param bookmarks
   */
  static process_bookmark = async (bookmarks) => {
    for (var i = 0; i < bookmarks.length; i++) {
      var bookmark = bookmarks[i];

      if (bookmark.url) {
        let favicon = await BackgroundManager.fetchFavicon(bookmark.url);
        bookmarks_map[bookmark.title] = {
          favicon: favicon,
          url: bookmark.url,
        };
        // chrome.storage.local.get([bookmark.title], function (result) {
          
        //   let res = result[bookmark.title] || 0;
        //   ranks[bookmark.title] = res;
          
        // });
        ranks[bookmark.title] = ranks[bookmark.title] || 0
      }

      if (bookmark.children) {
        BackgroundManager.process_bookmark(bookmark.children);
      }
    }
  };


  /**
   * Fetching all the favicons for the
   * bookmarks' url from chrome://favicon
   * @param url
   */
  static fetchFavicon = (url) => {
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
   static fetchBookmarks = () => {
    chrome.bookmarks.getTree(BackgroundManager.process_bookmark);

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
            
              
              if (!tabs[0].url.startsWith('chrome://') && 
              !tabs[0].url.startsWith('https://chrome.google.com/') &&
              !tabs[0].url.startsWith('https://chrome.google.com/')
              ) {
                
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { data: bookmarks_map,
                    ranks: ranks
                  },
                  function (resp) {}
                );
              }
            
          }
        );
      }
    });

    chrome.runtime.onInstalled.addListener(function() {
      chrome.tabs.create({"url":"popup.html"})
    });
    
    chrome.runtime.setUninstallURL("https://raj1998.github.io/zap-search/uninstalled", () => {
    });
  }

  /**
   * Utility event listeners for functionality
   * of the extension
   */
  setUtilityListeners() {
    chrome.runtime.onMessage.addListener( function (
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
      } else if (request.action == 'prependedJs') {
        sendResponse('OK');
      } else if (request.action == 'settings') {
        chrome.tabs.create({
          url: 'chrome://settings',
        });
        sendResponse('OK');
      } else if (request.action == 'history') {
        chrome.tabs.create({
          url: 'chrome://history',
        });
        sendResponse('OK');
      } else if (request.action == 'shortcuts') {
        chrome.tabs.create({
          url: 'chrome://extensions/shortcuts',
        });
        sendResponse('OK');
      } else if (request.action == 'queryHistory') {
        let historyData = {}
        chrome.history.search({text: request.q, maxResults: 10},  function(data) {
          data.forEach( async function(page, idx) {
          let favicon = await BackgroundManager.fetchFavicon(page.url);
            historyData[page.title] =  {
              favicon: favicon,
              url: page.url,
              type: 'history'
            };
            if (idx === data.length - 1) {
            sendResponse(historyData)
            }
          });
          
        })
        return true;
      } else if (request.action == 'queryBookmarks') {
        BackgroundManager.fetchBookmarks()
        // console.log(bookmarks_map, Object.keys(bookmarks_map).length);
        sendResponse({bm: bookmarks_map})
        return true;
      } else if (request.action == 'queryGoogle') {
        window.open(`https://www.google.com/search?q=${request.q}`)
        sendResponse('OK')
      } else if (request.action == 'deDuplicate') {
        var mySet = new Set();
        chrome.tabs.query({ currentWindow: true }, (tabs) => {
          for(let i = 0; i < tabs.length; i++){
            if (mySet.has(tabs[i].url)) {
              console.log('av');
              
              chrome.tabs.remove(tabs[i].id);
            }
            else{
              mySet.add(tabs[i].url);
            }
          }
        })
        sendResponse('OK')
      } else if (request.action == 'deDuplicateAll') {
        var mySet = new Set();
        chrome.tabs.query({}, (tabs) => {
          for(let i = 0; i < tabs.length; i++){
            if (mySet.has(tabs[i].url)) {
              console.log('av');
              
              chrome.tabs.remove(tabs[i].id);
            }
            else{
              mySet.add(tabs[i].url);
            }
          }
        })

        sendResponse('OK')
      }
      



    });
  }
}

// chrome.storage.local.get(null, function(items) {

//   var allKeys = Object.keys(items);
//   for (let i of allKeys){
//     console.log(i, items[i]);
    
//   }
  
// });

const bgManager = new BackgroundManager();
BackgroundManager.fetchBookmarks();
bgManager.setLaunchListener();
bgManager.setUtilityListeners();

// chrome.storage.local.set({key: 'raj'}, function() {
//   console.log('Value is set to ' + 'raj');
// });

// chrome.storage.local.get(['key'], function(result) {
//   console.log('Value currently is ' + result.key);
// });

// chrome.history.search({text: 'stack', maxResults: 10}, function(data) {
//   data.forEach(function(page) {
//       console.log(page, page.url);
//   });
// });