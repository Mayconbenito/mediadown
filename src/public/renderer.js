const { ipcRenderer } = window.require("electron");

const urlInput = document.querySelector("#url-input");
const downloadButton = document.querySelector("#download-button");
const openFolderButton = document.querySelector("#open-folder-button");
const downloadOption = document.querySelector("#options-select");

function renderItem(data) {
  const listOfItems = document.querySelector(".items-list");
  const item = document.createElement("div");
  item.className = "item";
  item.id = `item-${data.id}-${data.filter}`;

  const thumbnail = document.createElement("img");
  thumbnail.className = "item-thumbnail";
  thumbnail.src = data.thumbnail;

  const itemDetails = document.createElement("div");
  itemDetails.className = "item-details";

  const itemTitle = document.createElement("div");
  itemTitle.className = "item-title";
  itemTitle.innerText = data.title;

  const progress = document.createElement("progress");
  progress.value = data.progress;
  progress.className = "item-progress-bar";

  itemDetails.appendChild(itemTitle);
  itemDetails.appendChild(progress);

  item.appendChild(thumbnail);
  item.appendChild(itemDetails);
  listOfItems.appendChild(item);
}

downloadButton.addEventListener("click", function() {
  ipcRenderer.send("downloadFromURL", {
    url: urlInput.value,
    option: downloadOption.value
  });
});

openFolderButton.addEventListener("click", function() {
  ipcRenderer.send("openDownloadFolder", {});
});

ipcRenderer.on("invalidURL", function() {
  alert("Invalid URL");
});

ipcRenderer.on("download", function(event, response) {
  const item = document.querySelector(
    `#item-${response.id}-${response.filter}`
  );
  if (!item) {
    renderItem(response);
  } else {
    item.childNodes[1].childNodes[1].value = response.progress;
  }
});
