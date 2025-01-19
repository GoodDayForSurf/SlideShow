const serverUrl = 'http://localhost:9999/';
let delay = 5;
const appearanceDelay = 1;
const players = {
    image: null,
    video: null,
};
const imgHelper = new Image();
const STORAGE_KEY = 'slideshow-last-position';

let FOTOS = [];
let currentFolder = '';
let currentIndex = 0;
let isCurrentShowImage = true;
let nextDelayTimeout;
let isPaused = false;

function saveLastPosition() {
    const currentFile = FOTOS[currentIndex - 1] || FOTOS[0];
    if (currentFile) {
        const lastPosition = {
            folder: currentFolder,
            file: currentFile,
            index: currentIndex - 1 >= 0 ? currentIndex - 1 : 0
        };
        console.log('----Save last position------>', lastPosition);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lastPosition));
    }
}

function getLastPosition() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedData = saved ? JSON.parse(saved) : null;
    console.log('------getLastPosition---->', savedData);
    return savedData;
}

function onLoadImg() {
    players.image.className = isPaused ? 'appearance' : 'appearance-and-hiding';
    players.image.style.backgroundImage = `url(${imgHelper.src})`;

    if (isPaused) { return; }

    nextDelayTimeout = setTimeout(() => {
        showNext();
    }, delay * 1000);
}

imgHelper.onload = function() {
    setTimeout(() => onLoadImg(), 50);
}

document.addEventListener("DOMContentLoaded", function() {
    const lastPosition = getLastPosition();
    const startPanel = document.querySelector('#start-panel');

    // Add Continue button if we have a saved position
    if (lastPosition) {
        const continueBtn = document.createElement('button');
        continueBtn.textContent = 'CONTINUE FROM LAST VIEW';

        continueBtn.onclick = async () => {
            const dirHandle = await window.showDirectoryPicker();
            const files = [];

            for await (const entry of dirHandle.values()) {
                if (entry.kind === 'file') {
                    files.push(await entry.getFile());
                }
            }

            currentFolder = dirHandle.name;
            handleFiles(files, lastPosition.index);
        };

        startPanel.appendChild(continueBtn);
    }

    document.querySelector("#choose-files-input").addEventListener("change", function() {
        const files = this.files;
        currentFolder = files[0].webkitRelativePath.split('/')[0];
        handleFiles([...files]);
    });
});

function handleFiles(files, startIndex = 0) {
    document.body.style.setProperty('--appearance-delay', appearanceDelay + 's');

    FOTOS = files.flatMap(f => {
        const isVideo = f.type.startsWith("video/mp4");
        const isFileForShow = isVideo || f.type.startsWith("image/");
        return isFileForShow ? [URL.createObjectURL(f) + (isVideo ? '\u00A0video=true' : '')] : [];
    });

    currentIndex = startIndex;
    init();
}

function enablePlayer(player) {
    isCurrentShowImage = player !== players.video;

    if(isCurrentShowImage) {
        players.video.pause();
        players.video.blur();
        document.body.focus();
    }

    players.image.className = isCurrentShowImage ? '' : 'disabled';
    players.video.className = isCurrentShowImage ? 'disabled' : '';
}


function showNext() {
    saveLastPosition();

    let [src, isVideo] = FOTOS[currentIndex].split('\u00A0');
    isVideo = isVideo || /mp4$/i.test(src);

    if (isVideo) {
        enablePlayer(players.video);
        players.video.src = src;
        players.video.load();
        players.video.focus();
    } else {
        enablePlayer(players.image)
        players.image.style.backgroundImage = 'none';
        players.image.className = '';
        imgHelper.src = src;
    }

    currentIndex += 1;

    if (FOTOS.length === currentIndex) {
        currentIndex = 0;
    }
}

async function initFromServer() {
    const html = await fetch(serverUrl);
    const text = await html.text();

    const tmpEl = document.createElement('div');
    document.body.appendChild(tmpEl);
    tmpEl.innerHTML = text;

    FOTOS = [...document.querySelectorAll('a')].flatMap((el) => {
        const href = el.getAttribute('href');

        return /\.[\d\w]{2,4}$/i.test(href) ? [serverUrl + href] : [];
    });

    tmpEl.remove();
}

async function init(useServer = false) {
    await (useServer ? initFromServer() : null);

    document.querySelector('#start-panel').style.display = 'none';
    document.querySelector('#canvas').className = 'enabled';

    players.video = document.querySelector('#video-player');
    players.image = document.querySelector('#img-player');

    players.video.addEventListener("loadedmetadata", function() {
        const videoWidth = this.videoWidth;
        const videoHeight = this.videoHeight;
        players.video.style.height = "calc(100vh - 5px)";
    });

    players.video.addEventListener('ended', function() {
        showNext();
    });

    addKeyboardControls();

    showNext();
    changeDelay(0);
}

function changeDelay(diff) {
    delay += (delay + diff <= appearanceDelay * 2 ? 0 : diff);
    const infoEl = document.querySelector('#info-container');

    document.body.style.setProperty('--showing-time', delay + 's' );

    infoEl.innerHTML = `Delay is ${delay} s`;
    infoEl.className = 'active';

    clearTimeout(changeDelay.timeout);
    changeDelay.timeout = setTimeout(() => {
        infoEl.className = '';
    }, 2000);
}

function addKeyboardControls() {
    document.body.addEventListener("keydown", function(event) {
        console.log('----using CTRL------>', event.ctrlKey);

        switch (event.code) {
            case "ArrowLeft":
                currentIndex = currentIndex - (event.ctrlKey ? 11 : 2);
                clearTimeout(nextDelayTimeout);
                currentIndex = currentIndex > 1 ? currentIndex : 0;
                showNext();
                break;
            case "ArrowRight":
                currentIndex = currentIndex + (event.ctrlKey ? 10 : 0);
                clearTimeout(nextDelayTimeout);
                showNext();
                break;
            case "NumpadSubtract":
            case "Minus":
                changeDelay(-1);
                break;
            case "NumpadAdd":
            case "equal":
                changeDelay(1);
                break;
            case "Space":
                isPaused = !isPaused;
                clearTimeout(nextDelayTimeout);

                document.querySelector('#pause-icon').style.display = isPaused ? 'block' : 'none';

                players.image.className = '';

                if(!isPaused) {
                    players.image.className = 'hiding';

                    setTimeout(() => {
                        players.image.style.backgroundImage = 'none';
                        players.image.className = '';
                        showNext();
                    }, appearanceDelay * 1000)
                }

                event.preventDefault();
                break;
        }
    });
}

